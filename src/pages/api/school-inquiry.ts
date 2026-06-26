import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';

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

    const f = {
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      school_or_district: school_or_district?.trim() || null,
      role_title: role_title?.trim() || null,
      estimated_teachers: estimated_teachers?.trim() || null,
      message: message?.trim() || null,
    };

    const admin = createSupabaseAdmin();
    await admin.from('school_inquiries').insert(f);

    // Notify the site owner. Awaited but never fatal — the inquiry is stored.
    const row = (label: string, val: string | null) =>
      val ? `<p style="margin:4px 0;"><strong>${label}:</strong> ${esc(val)}</p>` : '';
    await sendOwnerNotification({
      subject: `New school/district inquiry — ${f.school_or_district || f.full_name}`,
      replyTo: f.email,
      text:
        `New school/district inquiry\n\n` +
        `Name: ${f.full_name}\nEmail: ${f.email}\n` +
        `Phone: ${f.phone ?? '—'}\nSchool/District: ${f.school_or_district ?? '—'}\n` +
        `Role: ${f.role_title ?? '—'}\nEstimated teachers: ${f.estimated_teachers ?? '—'}\n\n` +
        `Message:\n${f.message ?? '—'}\n`,
      html:
        `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New school / district inquiry</h2>` +
        `<p style="margin:4px 0;"><strong>Name:</strong> ${esc(f.full_name)}</p>` +
        `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${esc(f.email)}">${esc(f.email)}</a></p>` +
        row('Phone', f.phone) +
        row('School / District', f.school_or_district) +
        row('Role', f.role_title) +
        row('Estimated teachers', f.estimated_teachers) +
        (f.message ? `<p style="margin:12px 0 4px;"><strong>Message:</strong></p><p style="margin:0;white-space:pre-wrap;">${esc(f.message)}</p>` : ''),
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
