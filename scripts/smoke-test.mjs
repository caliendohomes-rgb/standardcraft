/**
 * StandardCraft Runtime Smoke Test
 *
 * Exercises the live credit lifecycle against your Supabase project using the
 * same RPCs the app calls in production:
 *   - increment_credits          (called by the Stripe webhook on credit grant)
 *   - redeem_credit_for_download (called by /api/download on every download)
 *
 * It mirrors steps 1–3 of the manual launch test (signup credit, download,
 * re-download) plus idempotency and insufficient-credit guards — all against a
 * disposable test user that is deleted at the end.
 *
 * This validates the manually-installed Supabase pieces (schema, RLS-enabled
 * tables, and the two RPC functions). It does NOT exercise Stripe or the HTTP
 * layer — run the live browser test for those.
 *
 * Usage:
 *   node scripts/smoke-test.mjs        # live run against Supabase
 *
 * Requires .env in project root with:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadEnv() {
  try {
    const contents = await readFile(join(__dirname, '..', '.env'), 'utf-8');
    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = process.env[key] ?? val;
    }
  } catch {
    // rely on real env vars if .env is absent
  }
}

let pass = 0;
let fail = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

async function main() {
  await loadEnv();

  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stamp = Date.now();
  const testEmail = `smoke-test+${stamp}@standardcraft.invalid`;
  const testSlug = `smoke-test-resource-${stamp}`;
  let userId = null;

  console.log(`\nStandardCraft smoke test — ${new Date().toISOString()}`);
  console.log(`Project: ${url}\n`);

  try {
    // ---- Step 0: preflight (confirm RPCs are installed) ----
    console.log('Preflight — RPC availability');
    {
      const { error } = await admin.rpc('increment_credits', { p_user_id: '00000000-0000-0000-0000-000000000000', p_amount: 0 });
      // A "function does not exist" error means the migration was not applied.
      const missing = error && /does not exist|not find|schema cache/i.test(error.message || '');
      check('increment_credits RPC is installed', !missing, error?.message);
    }
    {
      const { error } = await admin.rpc('redeem_credit_for_download', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_resource_id: null,
        p_resource_slug: '__preflight__',
        p_credit_cost: 1,
      });
      const missing = error && /does not exist|not find|schema cache/i.test(error.message || '');
      check('redeem_credit_for_download RPC is installed', !missing, error?.message);
    }

    // ---- Step 1: create a disposable user (mirrors registration) ----
    console.log('\nStep 1 — Signup');
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: testEmail,
      password: `Smoke!${stamp}`,
      email_confirm: true,
      user_metadata: { full_name: 'Smoke Test' },
    });
    if (createErr || !created?.user) {
      check('create test auth user', false, createErr?.message);
      throw new Error('Cannot continue without a test user.');
    }
    userId = created.user.id;
    check('create test auth user', true);

    // handle_new_user trigger should have created a profiles row.
    const { data: profile } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    check('handle_new_user trigger created profiles row', !!profile,
      'profiles row missing — check the on_auth_user_created trigger in 001_schema.sql');

    // Grant the signup credit the same way register.ts does.
    await admin.from('credits').upsert({ user_id: userId, balance: 0, lifetime_earned: 0, lifetime_spent: 0 });
    await admin.from('credit_ledger').insert({
      user_id: userId, amount: 1, type: 'signup_bonus',
      description: 'Smoke test signup credit',
    });
    await admin.from('credits').update({ balance: 1, lifetime_earned: 1 }).eq('user_id', userId);

    const { data: afterSignup } = await admin.from('credits').select('balance').eq('user_id', userId).single();
    check('signup grants 1 credit', afterSignup?.balance === 1, `balance=${afterSignup?.balance}`);

    // ---- Step 2: download (redeem 1 credit via RPC) ----
    console.log('\nStep 2 — Download (redeem credit)');
    const { data: redeem1, error: redeemErr1 } = await admin.rpc('redeem_credit_for_download', {
      p_user_id: userId, p_resource_id: null, p_resource_slug: testSlug, p_credit_cost: 1,
    });
    check('redeem RPC succeeds', !redeemErr1 && redeem1?.success === true, redeemErr1?.message || JSON.stringify(redeem1));

    const { data: afterDownload } = await admin.from('credits').select('balance, lifetime_spent').eq('user_id', userId).single();
    check('balance decremented to 0', afterDownload?.balance === 0, `balance=${afterDownload?.balance}`);
    check('lifetime_spent incremented to 1', afterDownload?.lifetime_spent === 1, `lifetime_spent=${afterDownload?.lifetime_spent}`);

    const { data: dlRow } = await admin.from('downloads').select('id').eq('user_id', userId).eq('resource_slug', testSlug).maybeSingle();
    check('download row recorded', !!dlRow);

    const { data: ledgerRedemption } = await admin.from('credit_ledger')
      .select('amount, type').eq('user_id', userId).eq('type', 'redemption').maybeSingle();
    check('redemption ledger entry recorded (amount -1)', ledgerRedemption?.amount === -1, JSON.stringify(ledgerRedemption));

    // ---- Step 3: re-download (must NOT charge again) ----
    console.log('\nStep 3 — Re-download (no charge)');
    const { data: redeem2, error: redeemErr2 } = await admin.rpc('redeem_credit_for_download', {
      p_user_id: userId, p_resource_id: null, p_resource_slug: testSlug, p_credit_cost: 1,
    });
    check('re-download returns redownload=true', !redeemErr2 && redeem2?.success === true && redeem2?.redownload === true,
      redeemErr2?.message || JSON.stringify(redeem2));

    const { data: afterRedl } = await admin.from('credits').select('balance').eq('user_id', userId).single();
    check('balance unchanged at 0 after re-download', afterRedl?.balance === 0, `balance=${afterRedl?.balance}`);

    // ---- Step 4: insufficient credits guard ----
    console.log('\nStep 4 — Insufficient-credit guard');
    const { data: redeem3 } = await admin.rpc('redeem_credit_for_download', {
      p_user_id: userId, p_resource_id: null, p_resource_slug: `${testSlug}-other`, p_credit_cost: 1,
    });
    check('new download with 0 balance is rejected', redeem3?.success === false, JSON.stringify(redeem3));

    // ---- Step 5: webhook credit grant (increment_credits) ----
    console.log('\nStep 5 — Subscription credit grant (webhook RPC)');
    const { error: incErr } = await admin.rpc('increment_credits', { p_user_id: userId, p_amount: 8 });
    check('increment_credits RPC succeeds', !incErr, incErr?.message);
    const { data: afterGrant } = await admin.from('credits').select('balance, lifetime_earned').eq('user_id', userId).single();
    check('balance increased by 8 (0 -> 8)', afterGrant?.balance === 8, `balance=${afterGrant?.balance}`);
    check('lifetime_earned increased to 9', afterGrant?.lifetime_earned === 9, `lifetime_earned=${afterGrant?.lifetime_earned}`);

  } catch (err) {
    console.error(`\nFatal: ${err.message}`);
    fail++;
  } finally {
    // ---- Cleanup: delete the test user (cascades to all child rows) ----
    if (userId) {
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      console.log(`\nCleanup — ${delErr ? `FAILED to delete test user (${delErr.message})` : 'test user deleted'}`);
    }
  }

  console.log(`\n${'='.repeat(48)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  console.log('='.repeat(48));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
