import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Transactional email via authenticated SMTP (Google Workspace).
 *
 * Sends owner notifications for contact / school-inquiry form submissions.
 * Configured entirely through server-side environment variables — no secrets
 * are committed. If SMTP is not configured, sends are skipped gracefully so
 * form submissions never fail (the row is still stored in Supabase).
 *
 * Required env vars (set in Netlify → Site settings → Environment variables):
 *   SMTP_USER                  e.g. support@standard-craft.com
 *   SMTP_PASS                  Google Workspace App Password (NOT the login password)
 * Optional (sensible defaults for Google Workspace):
 *   SMTP_HOST                  default: smtp.gmail.com
 *   SMTP_PORT                  default: 465
 *   EMAIL_FROM                 default: SMTP_USER  (must be the authenticated mailbox or an alias of it)
 *   CONTACT_NOTIFICATION_EMAIL default: SMTP_USER  (comma-separated list allowed)
 */

type SendArgs = {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  const user = import.meta.env.SMTP_USER;
  const pass = import.meta.env.SMTP_PASS;
  if (!user || !pass) return null; // not configured — caller skips gracefully

  if (cachedTransport) return cachedTransport;

  const host = import.meta.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(import.meta.env.SMTP_PORT || 465);

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user, pass },
  });

  return cachedTransport;
}

/**
 * Send a notification to the site owner. Never throws — returns a status
 * object so callers can log without failing the user's submission.
 */
export async function sendOwnerNotification({
  subject,
  text,
  html,
  replyTo,
}: SendArgs): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const transport = getTransport();
  const from = import.meta.env.EMAIL_FROM || import.meta.env.SMTP_USER;
  // All inquiries, registrations, and purchases route here by default;
  // override with CONTACT_NOTIFICATION_EMAIL (comma-separated list allowed).
  const to = import.meta.env.CONTACT_NOTIFICATION_EMAIL || 'support@standard-craft.com';

  if (!transport || !from || !to) {
    return { sent: false, skipped: true };
  }

  try {
    await transport.sendMail({ from, to, subject, text, html, replyTo });
    return { sent: true };
  } catch (err: any) {
    console.error('EMAIL_SEND_FAILED', err?.message ?? err);
    return { sent: false, error: err?.message ?? 'unknown error' };
  }
}

/** Minimal HTML escaping for user-supplied values placed into notification HTML. */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
