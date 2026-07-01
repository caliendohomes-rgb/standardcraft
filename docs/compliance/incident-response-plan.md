# Incident Response Plan — StandardCraft

_Version: 1.0 | Effective: 2026-07-01_

---

## 1. Purpose

This plan defines how StandardCraft detects, responds to, and recovers from security incidents affecting user data, platform availability, or system integrity.

---

## 2. Incident Classifications

| Severity | Description | Response SLA |
|----------|-------------|--------------|
| P0 — Critical | Data breach, unauthorized access to PII, payment fraud | ≤ 1 hour |
| P1 — High | Service outage > 30 min, Stripe webhook failure, auth bypass | ≤ 4 hours |
| P2 — Medium | Elevated error rates, suspicious access patterns, failed backups | ≤ 24 hours |
| P3 — Low | Single-user issues, minor bugs with workarounds | ≤ 72 hours |

---

## 3. Incident Response Process

### Step 1 — Detect
- **Sources:** Netlify function logs, Supabase `audit_log` table, user reports via contact form, Stripe dashboard alerts
- **Automated signals:** Function error rate spikes visible in Netlify dashboard

### Step 2 — Contain
- **Supabase:** Disable RLS policies or revoke affected user's session via Supabase dashboard → Auth → Users
- **Stripe:** Dispute charges via Stripe dashboard; suspend webhook endpoint if compromised
- **Netlify:** Rollback deploy via Netlify dashboard → Deploys → Publish previous

### Step 3 — Investigate
1. Query `audit_log` table:
   ```sql
   SELECT * FROM audit_log
   WHERE event_type IN ('download.success', 'user.register')
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```
2. Review Netlify function logs for the affected time window
3. Check Supabase Auth logs (Dashboard → Authentication → Logs)

### Step 4 — Eradicate
- Deploy patch to resolve root cause
- Force-expire affected sessions via Supabase admin API if needed
- Rotate secrets (Stripe keys, Supabase service key) if exposed

### Step 5 — Recover
- Re-enable access after patch is deployed and verified
- Restore from Supabase automated backups if data integrity is affected (backups retained 7 days on Pro plan)

### Step 6 — Post-Incident Review
- Document timeline, root cause, and remediation steps
- Update this plan and the SOC 2 control matrix
- Notify affected users within 72 hours if PII was exposed (per Privacy Policy)

---

## 4. Notification Requirements

| Scenario | Who to Notify | When |
|----------|--------------|------|
| PII data breach | Affected users + applicable regulators | ≤ 72 hours of discovery |
| Payment data breach | Stripe (immediately), affected users | Immediately |
| Service outage > 2 hrs | No formal SLA (B2C product) | Status page update |

---

## 5. Contact Information

| Role | Contact |
|------|---------|
| Site Owner / Incident Commander | caliendohomes@gmail.com |
| Supabase Support | support@supabase.io |
| Stripe Support | support.stripe.com |
| Netlify Support | support.netlify.com |

---

## 6. Secret Rotation Procedure

If `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` are suspected to be compromised:

1. Generate new key in the respective dashboard
2. Update Netlify environment variables (Site settings → Environment variables)
3. Trigger a new deploy in Netlify to pick up the new keys
4. Revoke the old key
5. Log the rotation in the `audit_log` with event type `secret.rotated` via admin SQL
