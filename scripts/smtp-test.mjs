#!/usr/bin/env node
/**
 * SMTP self-test — verifies the support@standard-craft.com mailbox can send,
 * independent of the app. Run this BEFORE testing registration so you can tell
 * an SMTP problem apart from a Supabase/registration problem.
 *
 * Usage (from repo root, with your real values — do NOT commit them):
 *
 *   SMTP_USER='support@standard-craft.com' \
 *   SMTP_PASS='your-google-app-password'   \
 *   TEST_TO='your-inbox@example.com'        \
 *   node scripts/smtp-test.mjs
 *
 * Optional overrides: SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465),
 * EMAIL_FROM (default = SMTP_USER).
 *
 * A "sent OK" line + a message in TEST_TO's inbox = SMTP is good.
 */
import nodemailer from 'nodemailer';

const {
  SMTP_USER,
  SMTP_PASS,
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  EMAIL_FROM,
  TEST_TO,
} = process.env;

if (!SMTP_USER || !SMTP_PASS) {
  console.error('✗ SMTP_USER and SMTP_PASS are required. See the header of this file.');
  process.exit(1);
}
const to = TEST_TO || SMTP_USER;
const from = EMAIL_FROM || SMTP_USER;
const port = Number(SMTP_PORT);

const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

console.log(`→ Verifying connection to ${SMTP_HOST}:${port} as ${SMTP_USER} …`);

try {
  await transport.verify();
  console.log('✓ SMTP auth + connection OK');
} catch (err) {
  console.error('✗ SMTP verify failed:', err?.message ?? err);
  console.error('  Common causes: wrong app password, 2FA not enabled, or port blocked.');
  process.exit(1);
}

try {
  const info = await transport.sendMail({
    from,
    to,
    subject: 'StandardCraft SMTP self-test',
    text: 'If you can read this, support@standard-craft.com can send mail. ✅',
    html: '<p>If you can read this, <strong>support@standard-craft.com</strong> can send mail. ✅</p>',
  });
  console.log(`✓ Test email sent OK → ${to} (messageId: ${info.messageId})`);
  console.log('  Check that inbox (and spam) to confirm delivery.');
} catch (err) {
  console.error('✗ sendMail failed:', err?.message ?? err);
  process.exit(1);
}
