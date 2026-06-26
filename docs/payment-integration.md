# StandardCraft — Payment Integration (Stripe)

_Last updated: 2026-06-14_

**Status: Stripe is implemented and live-keyed.** This is not a placeholder. Checkout
sessions, the subscription webhook, and credit granting are all wired up. This document
describes the current setup and what must be verified before/at launch.

---

## 1. Provider & mode
- **Provider:** Stripe (`stripe` SDK v17, API version `2024-06-20`).
- **Mode:** Live. Account `acct_1Ti13U6g7MJF8pcM`.
- **Model:** Recurring subscriptions that grant monthly download **credits**.

## 2. Code map
| File | Responsibility |
|------|----------------|
| `src/lib/stripe.ts` | `getStripe()`, `PLANS` map, `creditsForPlan()` |
| `src/pages/api/checkout.ts` | Creates a Checkout Session (mode: `subscription`) for the signed-in user |
| `src/pages/api/webhook.ts` | Verifies signature, handles 4 event types, grants/syncs credits |
| `src/pages/pricing.astro` | Plan cards; Classroom/Pro POST to `/api/checkout` |

## 3. Plans & credits
| Plan | Price | Credits/mo | Checkout path |
|------|-------|-----------|---------------|
| Sampler (Free) | $0 | 1 (signup) | `/claim-free` (no Stripe) |
| Classroom | $29/mo | 8 | Stripe checkout (`plan=classroom`) |
| Pro | $69/mo | 20 | Stripe checkout (`plan=pro`) |
| School | $249+/mo | pooled | `/school-inquiry` (quote, no self-serve checkout) |

`creditsForPlan()`: classroom → 8, pro → 20, else → 0.

## 4. Required environment variables (Netlify)
Set in Netlify → Site settings → Environment variables (Functions scope):

| Variable | Purpose | Notes |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | Server Stripe auth | **`sk_live_…`** — secret, server-only |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures | **`whsec_…`** from the webhook endpoint |
| `STRIPE_PRICE_CLASSROOM_MONTHLY` | Classroom monthly price | `price_…` |
| `STRIPE_PRICE_CLASSROOM_ANNUAL` | Classroom annual price | `price_…` (UI not yet wired — see gap) |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro monthly price | `price_…` |
| `STRIPE_PRICE_PRO_ANNUAL` | Pro annual price | `price_…` (UI not yet wired) |
| `PUBLIC_SITE_URL` | success/cancel redirect base | e.g. `https://standardcraftny.com` |
| `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (used to attach credits) | service key server-only |

> **Security:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
> `SUPABASE_SERVICE_ROLE_KEY` must be **Functions-scoped only** and never exposed to the
> client. The build's secret scan should report 0 matches.

## 5. Checkout flow
1. User clicks **Start Classroom/Pro** on `/pricing`.
2. Client checks Supabase session; if logged out → `/sign-in?redirect=/pricing`.
3. POST `/api/checkout` `{ plan, billing: 'monthly' }`.
4. Server validates plan, resolves `priceId`, gets/creates Stripe customer
   (`metadata.supabase_user_id`), creates session with:
   - `success_url`: `${PUBLIC_SITE_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url`: `${PUBLIC_SITE_URL}/pricing?checkout=cancelled`
   - `subscription_data.metadata`: `{ supabase_user_id, plan }`
   - `allow_promotion_codes: true`
5. Client redirects to `session.url`.

## 6. Webhook
**Endpoint:** `POST /api/webhook` (must be registered in Stripe Dashboard → Developers → Webhooks).

Handled events:
- `checkout.session.completed` → upsert `subscriptions`, grant initial credits.
- `invoice.payment_succeeded` (only `subscription_cycle`) → sync period, grant renewal credits.
- `customer.subscription.updated` / `customer.subscription.deleted` → sync status/period.

Idempotency: `grantSubscriptionCredits()` writes a `credit_ledger` row keyed
`subscription_{subId}_{YYYY-MM}` and no-ops if that period already granted. Credit balance
is incremented atomically via the `increment_credits` RPC (with a manual fallback).
Grant failures now log `CREDIT_GRANT_FAILED …` to the function logs.

### Required webhook setup (verify)
1. Stripe Dashboard → Developers → Webhooks → endpoint
   `https://standardcraftny.com/api/webhook`.
2. Subscribe to: `checkout.session.completed`, `invoice.payment_succeeded`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
3. Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` and redeploy.

## 7. Pre-launch verification checklist
- [ ] All `STRIPE_PRICE_*` IDs are **live-mode** prices (not test).
- [ ] `STRIPE_WEBHOOK_SECRET` matches the live endpoint's signing secret.
- [ ] Run a real $1-equivalent test (or Stripe test clock) end-to-end:
      checkout → `dashboard?checkout=success` → credits incremented → webhook 200.
- [ ] Confirm `success_url`/`cancel_url` resolve on the production domain (needs SSL live).
- [ ] Confirm secret scan = 0 in the latest deploy.

## 8. Known gaps / next steps
1. **Annual billing UI** — wire a monthly/annual toggle that sends `billing: 'annual'`.
2. **Self-serve management** — add a Stripe Billing Portal link on `/account`
   (`stripe.billingPortal.sessions.create`) for cancel/upgrade/card update.
3. **Dunning** — decide behavior on `invoice.payment_failed` (not currently handled).
4. **School plan** — currently quote-only via `/school-inquiry`; no automated checkout.
