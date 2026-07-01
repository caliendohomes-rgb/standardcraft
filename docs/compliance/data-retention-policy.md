# Data Retention Policy — StandardCraft

_Version: 1.0 | Effective: 2026-07-01_

---

## 1. Purpose

Defines what data StandardCraft collects, how long it is retained, and how it is deleted — satisfying SOC 2 CC6.5, ISO 27001 A.8.3, and applicable privacy regulations.

---

## 2. Data Inventory

| Data Category | Where Stored | Retention Period | Deletion Method |
|---------------|-------------|------------------|-----------------|
| User account (email, name, phone) | Supabase `profiles` | Life of account + 30 days | Hard delete via admin API |
| Auth credentials (hashed password, sessions) | Supabase Auth | Life of account | Auth.deleteUser() |
| Download history | Supabase `downloads` | Life of account + 1 year | Cascade on user delete |
| Credit ledger | Supabase `credit_ledger` | Life of account + 3 years (financial records) | Archive then delete |
| Subscription records | Supabase `subscriptions` | 7 years (financial/tax records) | Archive, do not delete |
| Contact messages | Supabase `contact_messages` | 2 years | Scheduled delete |
| School inquiries | Supabase `school_inquiries` | 3 years (sales records) | Scheduled delete |
| Audit log events | Supabase `audit_log` | 2 years | pg_cron or manual delete |
| Stripe customer/payment data | Stripe (processor) | Per Stripe's retention policy | Stripe data deletion request |
| Analytics (if enabled) | Plausible (privacy-first) | 2 years | Plausible account delete |

---

## 3. User-Requested Deletion

When a user requests account deletion:
1. Delete Supabase Auth user (cascades to all user-owned rows via FK ON DELETE CASCADE)
2. Submit Stripe customer data deletion request via Stripe dashboard
3. Retain `credit_ledger` and `subscriptions` rows in archived form for financial record requirements
4. Confirm deletion to user via email within 30 days

---

## 4. Automated Retention Enforcement

Target: implement pg_cron scheduled job to enforce retention:
```sql
-- Weekly cleanup of contact_messages older than 2 years
SELECT cron.schedule('retain-contact-messages', '0 4 * * 0',
  $$DELETE FROM contact_messages WHERE created_at < NOW() - INTERVAL '2 years'$$);

-- Weekly cleanup of audit_log older than 2 years
SELECT cron.schedule('retain-audit-log', '0 4 * * 0',
  $$DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '2 years'$$);
```

Status: **Documented — pending pg_cron enablement on Supabase Pro plan.**

---

## 5. Backup Retention

- Supabase automated backups: 7 days rolling (Pro plan)
- Backups are encrypted at rest and managed by Supabase (SOC 2 certified)
- Point-in-time recovery available on Pro plan

---

## 6. Data Classification

| Class | Definition | Examples |
|-------|-----------|---------|
| Public | Freely accessible | Resource previews, marketing content |
| Internal | Business operational | Analytics, system logs |
| Confidential | PII / user data | Email, name, download history |
| Restricted | Secrets and keys | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` |

Restricted data is never committed to version control (enforced by `.gitignore`).
