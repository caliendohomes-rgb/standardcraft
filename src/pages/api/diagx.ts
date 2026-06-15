import type { APIRoute } from 'astro';
import { createSupabaseAdmin, createSupabaseServerClient } from '../../lib/supabase-server';

export const prerender = false;

// TEMPORARY diagnostic endpoint — safe (leaks only key FORMAT, never values). Delete after use.
const fmt = (k: string | undefined) =>
  !k ? 'MISSING'
  : k.startsWith('sb_secret_') ? 'new-secret(sb_secret_)'
  : k.startsWith('sb_publishable_') ? 'new-publishable(sb_publishable_)'
  : k.startsWith('eyJ') ? 'jwt-legacy(eyJ)'
  : `unknown(${k.slice(0, 4)})`;

export const GET: APIRoute = async ({ request, cookies }) => {
  const out: any = {
    env: {
      PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL || 'MISSING',
      PUBLIC_SUPABASE_ANON_KEY: fmt(import.meta.env.PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: fmt(import.meta.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  };

  // Test 1: anon server client + getUser (this is what /sign-in does)
  try {
    const anon = createSupabaseServerClient(request, cookies);
    const { error } = await anon.auth.getUser();
    out.anonGetUser = { ok: !error, error: error?.message ?? null };
  } catch (e: any) {
    out.anonGetUser = { threw: e?.message, name: e?.name, stack: (e?.stack || '').split('\n').slice(0, 4) };
  }

  // Test 2: admin client + simple DB read (this is what the APIs/dashboard do)
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('profiles').select('id').limit(1);
    out.adminDbRead = { ok: !error, error: error?.message ?? null };
  } catch (e: any) {
    out.adminDbRead = { threw: e?.message, name: e?.name, stack: (e?.stack || '').split('\n').slice(0, 4) };
  }

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
