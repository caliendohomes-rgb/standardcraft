import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';
import { requireJson, requireString, requireEmail, optionalString, ValidationError, validationResponse } from '../../lib/validate';
import { logAudit } from '../../lib/audit';
import { rateLimit, tooManyRequests } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const rl = rateLimit(request, 'school-inquiry', 5, 10 * 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSeconds);

  try {
    requireJson(request);
    const body = await request.json();
    const {
      full_name: rawName, email: rawEmail, phone: rawPhone,
      school_or_district: rawSchool, role_title: rawRole,
      estimated_teachers: rawTeachers, message: rawMessage, honeypot,
    } = body;

    if (honeypot) return json({ error: 'Invalid submission.' }, 400);

    const full_name = requireString(rawName, 'Full name', 200);
    const email = requireEmail(rawEmail);
    const phone = optionalString(rawPhone, 'Phone', 50);
    const school_or_district = optionalString(rawSchool, 'School / District', 500);
    const role_title = optionalString(rawRole, 'Role', 200);
    const estimated_teachers = optionalString(rawTeachers, 'Estimated teachers', 50);
    const message = optionalString(rawMessage, 'Message', 10_000);

    const f = { full_name, email, phone, school_or_district, role_title, estimated_teachers, message };

    const admin = createSupabaseAdmin();
    await admin.from('school_inquiries').insert(f);

    await logAudit('school_inquiry.submitted', { request, metadata: { school_or_district } });

    const row = (label: string, val: string | null) =>
      val ? `<p style="margin:4px 0;"><strong>${label}:</strong> ${esc(val)}</p>` : '';
    await sendOwnerNotification({
      subject: `New school/district inquiry — ${school_or_district || full_name}`,
      replyTo: email,
      text:
        `New school/district inquiry\n\n` +
        `Name: ${full_name}\nEmail: ${email}\n` +
        `Phone: ${phone ?? '—'}\nSchool/District: ${school_or_district ?? '—'}\n` +
        `Role: ${role_title ?? '—'}\nEstimated teachers: ${estimated_teachers ?? '—'}\n\n` +
        `Message:\n${message ?? '—'}\n`,
      html:
        `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New school / district inquiry</h2>` +
        `<p style="margin:4px 0;"><strong>Name:</strong> ${esc(full_name)}</p>` +
        `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>` +
        row('Phone', phone) +
        row('School / District', school_or_district) +
        row('Role', role_title) +
        row('Estimated teachers', estimated_teachers) +
        (message ? `<p style="margin:12px 0 4px;"><strong>Message:</strong></p><p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>` : ''),
    });

    return json({ success: true });
  } catch (err) {
    if (err instanceof ValidationError) return validationResponse(err);
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
