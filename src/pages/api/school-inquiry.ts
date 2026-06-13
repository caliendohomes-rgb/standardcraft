import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      full_name, email, phone, school_or_district,
      role_title, estimated_teachers, message, honeypot,
    } = body;

    if (honeypot) return json({ error: 'Invalid submission.' }, 400);

    if (!full_name || !email) {
      return json({ error: 'Name and email are required.' }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }

    const admin = createSupabaseAdmin();
    await admin.from('school_inquiries').insert({
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      school_or_district: school_or_district?.trim() || null,
      role_title: role_title?.trim() || null,
      estimated_teachers: estimated_teachers?.trim() || null,
      message: message?.trim() || null,
    });

    return json({ success: true });
  } catch (err) {
    console.error('School inquiry error:', err);
    return json({ error: 'Submission failed. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
