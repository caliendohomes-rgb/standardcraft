import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';
import { requireJson, requireString, requireEmail, optionalString, ValidationError, validationResponse } from '../../lib/validate';
import { logAudit } from '../../lib/audit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    requireJson(request);
    const body = await request.json();
    const { name: rawName, email: rawEmail, subject: rawSubject, message: rawMessage, honeypot } = body;

    if (honeypot) return json({ error: 'Invalid submission.' }, 400);

    const name = requireString(rawName, 'Name', 200);
    const email = requireEmail(rawEmail);
    const subject = optionalString(rawSubject, 'Subject', 300) ?? 'General inquiry';
    const message = requireString(rawMessage, 'Message', 10_000);

    const admin = createSupabaseAdmin();
    await admin.from('contact_messages').insert({ name, email, subject, message });

    await logAudit('contact.submitted', { request, metadata: { subject } });

    await sendOwnerNotification({
      subject: `New contact message — ${subject}`,
      replyTo: email,
      text:
        `New contact form submission\n\n` +
        `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n` +
        `Message:\n${message}\n`,
      html:
        `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New contact message</h2>` +
        `<p style="margin:4px 0;"><strong>Name:</strong> ${esc(name)}</p>` +
        `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>` +
        `<p style="margin:4px 0;"><strong>Subject:</strong> ${esc(subject)}</p>` +
        `<p style="margin:12px 0 4px;"><strong>Message:</strong></p>` +
        `<p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>`,
    });

    return json({ success: true });
  } catch (err) {
    if (err instanceof ValidationError) return validationResponse(err);
    console.error('Contact form error:', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
