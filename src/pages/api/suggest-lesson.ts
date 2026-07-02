import type { APIRoute } from 'astro';
import { createSupabaseAdmin, createSupabaseApiClient } from '../../lib/supabase-server';
import { sendOwnerNotification, esc } from '../../lib/email';
import { requireJson, requireString, optionalString, ValidationError, validationResponse } from '../../lib/validate';
import { logAudit } from '../../lib/audit';
import { rateLimit, tooManyRequests } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const rl = rateLimit(request, 'suggest-lesson', 10, 10 * 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSeconds);

  try {
    requireJson(request);

    // Registered users only — identity comes from the session, never the body.
    const { client } = createSupabaseApiClient(request);
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return json({ error: 'Please sign in to submit a suggestion.' }, 401);
    }

    const body = await request.json();
    const title = requireString(body.title, 'Lesson title / topic', 200);
    const description = requireString(body.description, 'Description', 5_000);
    const subject = optionalString(body.subject, 'Subject', 100);
    const grade_level = optionalString(body.grade_level, 'Grade level', 50);
    const standard = optionalString(body.standard, 'Standard code', 100);

    const admin = createSupabaseAdmin();

    // Look up the submitter's profile for the notification.
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const { error: insertErr } = await admin.from('lesson_suggestions').insert({
      user_id: user.id,
      title,
      subject,
      grade_level,
      standard,
      description,
    });
    if (insertErr) {
      console.error('Lesson suggestion insert error:', insertErr.message);
      return json({ error: 'Could not save your suggestion. Please try again.' }, 500);
    }

    await logAudit('lesson_suggestion.submitted', {
      userId: user.id,
      request,
      metadata: { subject, grade_level },
    });

    const submitterName = profile?.full_name ?? 'A registered user';
    const submitterEmail = profile?.email ?? user.email ?? 'unknown';
    const row = (label: string, val: string | null) =>
      val ? `<p style="margin:4px 0;"><strong>${label}:</strong> ${esc(val)}</p>` : '';

    await sendOwnerNotification({
      subject: `New lesson-plan suggestion — ${title}`,
      replyTo: submitterEmail,
      text:
        `New lesson-plan suggestion from a registered user\n\n` +
        `From: ${submitterName} (${submitterEmail})\n` +
        `Title/topic: ${title}\n` +
        `Subject: ${subject ?? '—'}\nGrade level: ${grade_level ?? '—'}\n` +
        `Standard: ${standard ?? '—'}\n\n` +
        `Description:\n${description}\n`,
      html:
        `<h2 style="margin:0 0 12px;font-family:Georgia,serif;color:#172438;">New lesson-plan suggestion</h2>` +
        `<p style="margin:4px 0;"><strong>From:</strong> ${esc(submitterName)} ` +
        `(<a href="mailto:${esc(submitterEmail)}">${esc(submitterEmail)}</a>)</p>` +
        `<p style="margin:4px 0;"><strong>Title / topic:</strong> ${esc(title)}</p>` +
        row('Subject', subject) +
        row('Grade level', grade_level) +
        row('Standard', standard) +
        `<p style="margin:12px 0 4px;"><strong>Description:</strong></p>` +
        `<p style="margin:0;white-space:pre-wrap;">${esc(description)}</p>`,
    });

    return json({ success: true });
  } catch (err) {
    if (err instanceof ValidationError) return validationResponse(err);
    console.error('Lesson suggestion error:', err);
    return json({ error: 'Submission failed. Please try again.' }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
