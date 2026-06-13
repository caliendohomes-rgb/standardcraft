import type { APIRoute } from 'astro';
import { createSupabaseAdmin } from '../../lib/supabase-server';

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

    const admin = createSupabaseAdmin();
    await admin.from('contact_messages').insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject?.trim() || 'General inquiry',
      message: message.trim(),
    });

    return json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return json({ error: 'Message could not be sent. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
