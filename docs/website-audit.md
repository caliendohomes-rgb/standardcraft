# StandardCraft — Website Audit

_Last updated: 2026-06-14_

This audit reflects the **actual** state of the repository as inspected, not an assumed
barebones MVP. StandardCraft is already a mature, revenue-capable site. Most core
flows exist and work; the gaps are refinements, not missing foundations.

---

## 1. Current architecture summary

| Area | Implementation |
|------|----------------|
| **Framework** | Astro v4.15 (`output: 'hybrid'`) |
| **Styling** | Tailwind CSS v3.4 + design tokens in `src/styles/global.css` |
| **Hosting / CI** | Netlify (`@astrojs/netlify` v5.5, Node 20, esbuild functions) |
| **Auth** | Supabase Auth (email/password), cookie sessions via `@supabase/ssr` |
| **Database** | Supabase Postgres with RLS; migrations in `supabase/migrations/` |
| **File storage** | Supabase Storage (private `resources` bucket, signed URLs) |
| **Payments** | Stripe (live mode) — subscription checkout + webhook |
| **Content** | 50 Markdown resources in `src/content/resources/`, typed via `content/config.ts` |
| **Repo** | `github.com/caliendohomes-rgb/standardcraft`, branch `main` → Netlify auto-deploy |

### Routing structure (all present)

Public marketing
- `/` — homepage (hero, trust strip, how-it-works, sample resources, why-us, FAQ, CTA)
- `/pricing` — 4 plan cards + credit rules + FAQ
- `/resources` — public preview library (browse only, no auth)
- `/resources/[slug]` — individual resource preview (static, `getStaticPaths`)
- SEO landing pages: `/nys-lesson-plans`, `/nys-worksheets`, `/nys-math-resources`,
  `/nys-next-gen-ela-resources`, `/nyssls-science-resources`, `/nys-social-studies-resources`
- Legal: `/privacy`, `/terms`, `/data-security`, `/refunds-and-assurance`

Conversion + account
- `/claim-free` — signup form → `/api/register` → client sign-in
- `/sign-in` — Supabase password sign-in (+ `signin` redirect stub)
- `/dashboard` — authed: credits, subscription, recent downloads (SSR)
- `/account` — authed: profile, preferences, subscription (SSR)
- `/free-resource-library` — **authed, gated** download library with live credit balance (SSR)
- `/contact`, `/school-inquiry` — lead forms

API routes (`src/pages/api/`, all `prerender = false`)
- `register.ts` — create auth user + profile + preferences + 1 signup credit (idempotent)
- `checkout.ts` — create Stripe subscription checkout session
- `webhook.ts` — Stripe events → grant/sync subscription credits
- `download.ts` — verify auth, deduct 1 credit atomically (RPC), return signed URL
- `signout.ts` — clear Supabase session cookies → redirect home
- `contact.ts`, `school-inquiry.ts` — persist lead form submissions

### Two distinct "library" pages (important distinction)
- **`/resources`** = public marketing preview. No auth. Browse/filter cards. Funnel entry.
- **`/free-resource-library`** = authenticated library. Requires sign-in, shows the user's
  credit balance, and is where downloads + credit deduction actually happen.

> Note: dashboard / nav links to the library intentionally point to
> `/free-resource-library` (the functional one). A `netlify.toml` redirect must **not**
> rewrite `/free-resource-library` to `/resources`, because the page is SSR and Netlify
> redirects run before Astro's SSR catch-all — doing so would break the real library.

---

## 2. Launch blockers

| # | Blocker | Status |
|---|---------|--------|
| 0 | **Netlify env vars are EMPTY** — every SSR page + `/api/*` returns 500 (Supabase client gets `undefined`). | **OPEN — top priority.** Owner must set the 10 env vars (all scopes incl. Builds) and redeploy. See launch-readiness-checklist. |
| 1 | Custom domain SSL: `ERR_CERT_COMMON_NAME_INVALID` — apex serves the `*.netlify.app` wildcard cert | **OPEN (owner action).** DNS verified + on Netlify DNS; cert not yet issued for the custom hostname. Provision in Netlify → Domain management. Static site returns HTTP 200; reported "502" is stale. |
| 2 | `resources` DB table empty → downloads would 404 | **Resolved in code.** `download.ts` null-safe; seed runs on build — but the seed currently no-ops because env vars are missing (blocker 0). |
| 3 | UTF-8 mojibake in 6 templates | **Resolved.** |
| 4 | Crash-on-missing-row (`.single()`) in dashboard/account/free-resource-library | **Resolved** → `.maybeSingle()`. |

**The code has no hard blockers — but the deployment is unconfigured.** Until the Netlify
env vars are set (blocker 0), the entire app layer (auth, dashboard, library, checkout,
webhooks) is down. SSL (blocker 1) is secondary. Both are owner dashboard actions.

---

## 3. UX / UI gaps (refinements, not blockers)

- **Theme residue.** Many pages still use dark-theme Tailwind classes (`bg-[#111618]`,
  `text-teal-400`, `border-[#1e2a2d]`) that are force-overridden to the light palette via
  `!important` rules in `global.css`. Renders correctly but is fragile; a future cleanup
  should replace these with the `--sc-*` tokens directly.
- **No monthly/annual pricing toggle.** Annual Stripe price IDs exist in `lib/stripe.ts`
  (`STRIPE_PRICE_*_ANNUAL`) but the checkout button hardcodes `billing: 'monthly'`, so
  annual plans are unreachable from the UI.
- **No password reset flow** on `/sign-in`.
- **Homepage** does not yet include the brief's requested interactive "Triple-Lock" and
  dedicated SpecialEd/MLL sections (positioning is covered in copy elsewhere).

## 4. Functionality gaps
- Annual billing unreachable (see above).
- `customer.subscription.deleted` sets status but does not zero out / flag remaining
  credits — acceptable for launch, document as intended.
- Cancel-subscription is "from your Account page" in copy, but `/account` has no
  cancel/Stripe-portal button yet (links to `/pricing`).

## 5. SEO gaps
- Strong already: per-page titles/descriptions, canonical, OG/Twitter tags (now incl.
  `og:image`), `robots.txt`, `sitemap.xml`, dedicated NYS keyword landing pages.
- Missing: structured data (JSON-LD) is present on some pages (FAQ/pricing) — verify
  coverage; `og:image` is an SVG (works on most platforms; a PNG is more universally
  supported for Facebook/LinkedIn).

## 6. Accessibility gaps
- **Resolved this pass:** added `prefers-reduced-motion` support and global
  `:focus-visible` outlines in `global.css`.
- Remaining: audit color contrast of `--sc-slate` (#415066) on tinted card backgrounds;
  confirm all meaningful controls have discernible names.

## 7. Security / privacy gaps
- **Good:** service role key only used server-side (`supabase-server.ts`); RLS migrations
  present; Stripe webhook verifies signatures; security headers in `netlify.toml`;
  Netlify secret-scan passes (0 matches).
- Consider adding a Content-Security-Policy header (inline scripts currently used).
- No student PII collected — consistent with positioning.

## 8. Payment / auth gaps
- Stripe checkout + webhook implemented and live-keyed. See `payment-integration.md`.
- Auth is real (Supabase). Sign-out, sign-in, gated routes all functional.

---

## 9. Recommended fixes (prioritized)
1. **(Owner)** Finish SSL cert provisioning in Netlify → custom domain.
2. Add monthly/annual toggle on `/pricing` to unlock annual revenue.
3. Add Stripe billing-portal link on `/account` for self-serve cancel/upgrade.
4. Add password-reset on `/sign-in`.
5. Replace dark-theme class residue with `--sc-*` tokens (tech-debt cleanup).
6. Add JSON-LD `Organization` + `Product`/`Offer` structured data sitewide.
7. Provide a PNG `og-image` alongside the SVG for maximum social compatibility.

## 10. Completed fixes (this engagement)
- Null-safe `download.ts` (unseeded table no longer 404s).
- `.single()` → `.maybeSingle()` in `dashboard`, `account`, `free-resource-library`.
- Fixed UTF-8 mojibake across 6 templates.
- Added subject/grade client-side filtering on `/resources` honoring `?subject=`/`?grade=`.
- Resource seeding wired into the Netlify build (idempotent `upsert`).
- Added `og:image` + `twitter:image`; created `public/og-image.svg`.
- Webhook credit-grant failures now log with structured context.
- Added `prefers-reduced-motion` + `:focus-visible` accessibility styles.
- Reverted an earlier mistaken `/free-resource-library` → `/resources` reroute and removed
  a redirect that would have broken the SSR authed library.
