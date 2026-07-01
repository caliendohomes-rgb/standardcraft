# Access Control Policy — StandardCraft

_Version: 1.0 | Effective: 2026-07-01_

---

## 1. Purpose

Defines how access to StandardCraft systems, data, and infrastructure is granted, managed, and revoked — satisfying SOC 2 CC6.1–CC6.4 and ISO 27001 A.9.

---

## 2. Access Tiers

| Tier | Who | What they can access | How access is granted |
|------|-----|----------------------|-----------------------|
| Anonymous | Anyone | Public pages, resource previews | No credentials required |
| Authenticated User | Registered teachers | Own profile, credits, download history | Email + password ≥ 8 chars via Supabase Auth |
| Subscriber | Paid classroom/pro users | Full resource downloads per credit balance | Stripe subscription + Supabase RLS |
| Admin / Owner | Site owner only | Supabase dashboard, Netlify dashboard, Stripe dashboard | MFA-protected third-party accounts |

---

## 3. Principle of Least Privilege

- **API routes** use the Supabase anon key for user-authenticated requests; the service-role key is used only server-side for administrative operations
- **RLS policies** in `supabase/migrations/002_rls.sql` ensure users can only read/write their own rows
- **SECURITY DEFINER RPCs** (`increment_credits`, `redeem_credit_for_download`) in `003_functions.sql` are the only safe path to modify credit balances — direct table writes by anon/auth roles are blocked by RLS
- **Stripe secret key** is never sent to the browser; all Stripe operations are server-side only

---

## 4. Authentication Requirements

| Account type | Min password length | MFA required | Session expiry |
|-------------|---------------------|--------------|----------------|
| End user | 8 characters | Recommended | Supabase default (1 week) |
| Owner / admin | 16+ characters | Required | Per-session |

---

## 5. Access Provisioning

1. **New user registration:** `POST /api/register` creates Supabase Auth user + profile + credits row; all via service-role key with honeypot protection
2. **Subscription upgrade:** Stripe checkout → webhook → subscription row → credits grant
3. **Admin access:** Granted only to site owner; no shared credentials; no service accounts with standing access

---

## 6. Access Revocation

| Trigger | Action |
|---------|--------|
| User requests account deletion | Supabase admin delete user; Stripe subscription cancel |
| Subscription cancels | `customer.subscription.deleted` webhook sets `status = cancelled`; user retains credits until expiry |
| Suspected compromise | Force-expire session via Supabase Auth → Users → Invalidate sessions |
| Employee offboarding | N/A (single-person team) |

---

## 7. Privileged Access Review

- Quarterly: Review Supabase project members (Dashboard → Settings → Team)
- Quarterly: Review Netlify team members (Netlify → Team settings → Members)
- Annually: Rotate Stripe restricted API keys used for read-only reporting

---

## 8. Audit Trail

All authenticated access events are logged to the `audit_log` table (migration `004_audit_log.sql`). Log retention: 2 years.
