import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAlreadyRegistered(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('already exists') ||
    m.includes('email already') ||
    m.includes('duplicate') ||
    m.includes('user already')
  );
}

export const POST: APIRoute = async ({ request }) => {
  // Guard: verify service role key is configured before attempting any DB work.
  if (!import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set — registration cannot proceed.');
    return json({ error: 'Server configuration error. Please contact support.' }, 503);
  }

  try {
    const body = await request.json();
    const {
      email, password, full_name, phone,
      subjects, grade_levels, marketing_consent,
      honeypot,
    } = body;

    // Bot honeypot
    if (honeypot) {
      return json({ error: 'Invalid submission.' }, 400);
    }

    // Validation
    if (!email || !password || !full_name) {
      return json({ error: 'Name, email, and password are required.' }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }
    if (full_name.trim().length < 2) {
      return json({ error: 'Please enter your full name.' }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = createSupabaseAdmin();

    // Create auth user (skip email confirmation for frictionless onboarding)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (authError) {
      console.error('Auth create error:', authError.status, authError.message);
      if (isAlreadyRegistered(authError.message ?? '')) {
        return json({ error: 'An account with this email already exists. Please sign in instead.' }, 409);
      }
      return json({ error: 'Registration failed. Please try again.' }, 500);
    }

    if (!authData?.user?.id) {
      console.error('Auth createUser returned no user object');
      return json({ error: 'Registration failed. Please try again.' }, 500);
    }

    const userId = authData.user.id;

    // Create profile (trigger may have already inserted it — upsert is safe)
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });
    if (profileErr) console.error('Profile upsert error:', profileErr.message);

    // Create preferences — must specify onConflict because PK is `id`, not `user_id`
    const { error: prefErr } = await admin.from('user_preferences').upsert(
      {
        user_id: userId,
        subjects: Array.isArray(subjects) ? subjects : [],
        grade_levels: Array.isArray(grade_levels) ? grade_levels : [],
        marketing_consent: marketing_consent === true,
      },
      { onConflict: 'user_id' }
    );
    if (prefErr) console.error('Preferences upsert error:', prefErr.message);

    // Initialize credit balance — same issue, PK is `id`, conflict is on `user_id`
    const { error: credErr } = await admin.from('credits').upsert(
      { user_id: userId, balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
      { onConflict: 'user_id' }
    );
    if (credErr) console.error('Credits upsert error:', credErr.message);

    // Grant signup credit — idempotent check
    const { data: existingBonus } = await admin
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'signup_bonus')
      .maybeSingle();

    if (!existingBonus) {
      await admin.from('credit_ledger').insert({
        user_id: userId,
        amount: 1,
        type: 'signup_bonus',
        description: 'Free trial credit — welcome to StandardCraft',
      });
      await admin.from('credits')
        .update({ balance: 1, lifetime_earned: 1 })
        .eq('user_id', userId);
    }

    return json({ success: true, email: normalizedEmail });

  } catch (err: any) {
    console.error('Registration error:', err?.message ?? err);
    return json({ error: 'Registration failed. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
