import { createSupabaseAdmin } from './supabase-server';

export type AuditEventType =
  | 'user.register'
  | 'user.register_failed'
  | 'user.signout'
  | 'download.success'
  | 'download.failed'
  | 'download.redownload'
  | 'checkout.created'
  | 'purchase.completed'
  | 'webhook.received'
  | 'contact.submitted'
  | 'school_inquiry.submitted'
  | 'lesson_suggestion.submitted'
  | 'billing_portal.created';

export async function logAudit(
  eventType: AuditEventType,
  options: {
    userId?: string | null;
    resourceType?: string;
    resourceId?: string;
    request?: Request;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    const ip = options.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
    const ua = options.request?.headers.get('user-agent') ?? null;

    await admin.from('audit_log').insert({
      event_type: eventType,
      user_id: options.userId ?? null,
      resource_type: options.resourceType ?? null,
      resource_id: options.resourceId ?? null,
      ip_address: ip,
      user_agent: ua,
      metadata: options.metadata ?? null,
    });
  } catch {
    // Never let audit logging break the primary flow
  }
}
