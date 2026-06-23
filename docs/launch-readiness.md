# StandardCraft Launch Readiness Notes

## Current architecture

StandardCraft is currently a static JavaScript application built into `dist/` with `scripts/build.mjs`.
The app uses browser `localStorage` for demo account state, credits, and download history.

## Resource count

The launch catalog currently contains 50 resources in `src/data/resources.mjs`.
Public copy, metadata, QA checks, sitemap output, and resource pages are aligned to 50.
Do not market 90 resources until the catalog actually contains 90 complete records and downloads.

## Auth and credits

Current behavior:

- Signup grants exactly one free credit per normalized email in browser storage.
- Duplicate signup for the same normalized email does not grant another credit.
- First download of a resource costs one credit.
- Re-downloading an already claimed resource costs zero additional credits.
- Dashboard and account pages show credits and claimed downloads.

Production requirement:

- Move auth, credits, and download entitlements to Supabase or another server-backed system before paid launch.
- Enforce idempotent signup credit grants in the database, not browser storage.
- Store password credentials only through a real auth provider. The static demo must not be treated as production auth.

## Stripe readiness

Paid checkout is intentionally not live in the static build.
Classroom and Pro prices are displayed from the requirements model:

- Classroom: $29/mo or $210/yr, 8 credits/mo, about $3.63 per credit
- Pro: $69/mo or $690/yr, 20 credits/mo, about $3.45 per credit
- School: $249+/mo, pooled credits, custom / PO billing

Classroom and Pro CTAs route to contact until server-side Stripe checkout functions exist.
The School plan routes to `/school-inquiry`; it should not use Stripe checkout.

Production requirement:

- Create server-side checkout session functions.
- Store Stripe secret keys only in Netlify environment variables.
- Configure `STRIPE_PRICE_CLASSROOM_MONTHLY`, `STRIPE_PRICE_CLASSROOM_ANNUAL`, `STRIPE_PRICE_PRO_MONTHLY`, and `STRIPE_PRICE_PRO_ANNUAL`.
- Configure annual prices in Stripe as recurring annual intervals; code should pass the price ID directly.
- Enable promotion codes in checkout with `allow_promotion_codes: true`.
- Activate the Stripe Billing Portal before promising self-serve cancellation.
- Add webhook handling for checkout completion, subscription updates, cancellations, and payment failures.
- Map subscription status and credit/download entitlements to the dashboard.
- Test with Stripe test mode before enabling production mode.

Open pricing requirement:

- Classroom annual saves $138/yr (40%).
- Pro annual saves $138/yr (20%). If Pro should also save about 40%, the annual Stripe price should be about $497/yr instead of $690/yr.

## Supabase readiness

Required tables and functions:

- `credits`: one row per user with a non-negative `balance` column enforced at the database level.
- `credit_ledger`: audit trail; idempotency key `stripe_session_id = "subscription_{id}_{YYYY-MM}"` prevents double-granting on webhook retry.
- `downloads`: user id, resource slug, first downloaded at.
- `subscriptions`: user id, Stripe customer id, Stripe subscription id, plan, status, current period end.
- `school_inquiries`: school plan inquiry records for manual follow-up.
- `increment_credits` RPC: atomic add on subscription grant, with webhook fallback if unavailable.
- `redeem_credit_for_download` RPC: atomic deduct plus download record with row-level lock to prevent concurrent double-spend.

Suggested RLS posture:

- Users can read only their own profile, credit ledger, downloads, and subscription rows.
- Public resource metadata can be readable by anonymous users.
- Service-role access must stay server-side only.

## Netlify readiness

Current config:

- Build command: `npm run build`
- Publish directory: `dist`
- Static security headers are configured.
- Legacy signup and school-inquiry routes redirect or rewrite to active paths.

Production requirement:

- Add Netlify Functions for Stripe checkout and webhooks.
- Configure form notifications for school/contact inquiries.
- Set all Stripe and Supabase variables in Netlify environment settings.
- Ensure school inquiries insert into `school_inquiries` and trigger manual follow-up before any school onboarding.

## SEO readiness

Implemented:

- Canonical URLs use `https://standardcraftny.com`.
- Private account/dashboard/sign-in routes are noindexed.
- Sitemap includes public pages and resource preview pages.
- Resource previews include dynamic titles, descriptions, `LearningResource`, and breadcrumb structured data.
- Homepage includes Organization and WebSite structured data.

Target query clusters:

- NYS aligned lesson plans
- New York State standards worksheets
- NYS ELA resources
- NYS math resources
- classroom-ready NYS resources
- SDI lesson support
- MLL ELL classroom scaffolds
- teacher planning resources New York
- NYS standards resource library
- school resource planning support
