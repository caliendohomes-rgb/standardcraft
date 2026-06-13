import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
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
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('already been registered')) {
        return json({ error: 'An account with this email already exists. Please sign in instead.' }, 409);
      }
      console.error('Auth create error:', authError);
      throw authError;
    }

    const userId = authData.user.id;

    // Create profile
    await admin.from('profiles').upsert({
      id: userId,
      email: normalizedEmail,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
    });

    // Create preferences
    await admin.from('user_preferences').upsert({
      user_id: userId,
      subjects: Array.isArray(subjects) ? subjects : [],
      grade_levels: Array.isArray(grade_levels) ? grade_levels : [],
      marketing_consent: marketing_consent === true,
    });

    // Initialize credit balance
    await admin.from('credits').upsert({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      lifetime_spent: 0,
    });

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
    console.error('Registration error:', err);
    return json({ error: 'Registration failed. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
