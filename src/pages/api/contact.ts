import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, subject, message, honeypot } = body;

    if (honeypot) return json({ error: 'Invalid submission.' }, 400);

    if (!name || !email || !message) {
      return json({ error: 'Name, email, and message are required.' }, 400);
    }
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Please enter a valid email address.' }, 400);
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanSubject = subject?.trim() || 'General inquiry';
    const cleanMessage = message.trim();

    const admin = createSupabaseAdmin();
    await admin.from('contact_messages').insert({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage,
    });

    // Notify the site owner. Awaited so the serverless function doesn't freeze
    // before the email sends, but never fatal — the message is already stored.
    await sendOwnerNotification({
      subject: `New contact message — ${cleanSubject}`,
      replyTo: cleanEmail,
      text:
        `New contact form submission\n\n` +
        `Name: ${cleanName}\nEmail: ${cleanEmail}\nSubject: ${cleanSubject}\n\n` +
        `Message:\n${cleanMessage}\n`,
      html:
        `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New contact message</h2>` +
        `<p style="margin:4px 0;"><strong>Name:</strong> ${esc(cleanName)}</p>` +
        `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${esc(cleanEmail)}">${esc(cleanEmail)}</a></p>` +
        `<p style="margin:4px 0;"><strong>Subject:</strong> ${esc(cleanSubject)}</p>` +
        `<p style="margin:12px 0 4px;"><strong>Message:</strong></p>` +
        `<p style="margin:0;white-space:pre-wrap;">${esc(cleanMessage)}</p>`,
    });

    return json({ success: true });
  } catch (err) {
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
