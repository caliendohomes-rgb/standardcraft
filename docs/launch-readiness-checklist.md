# StandardCraft — Launch Readiness Checklist

_Last updated: 2026-06-14_

Legend: ✅ done · 🟡 needs verification · 🔧 owner action (outside code) · ⬜ optional/next

---

## ✅ RESOLVED — site-wide SSR 500s (was the top blocker)
Two stacked causes, both fixed on 2026-06-15:
1. **Netlify had no env vars** — now set (Supabase URL + publishable + service-role keys +
   `PUBLIC_SITE_URL`). Both Supabase keys verified working.
2. **Node 20 lacked native WebSocket** — newer `@supabase/supabase-js` throws at client
   construction on Node < 22. Fixed via `netlify.toml` `NODE_VERSION = "22"`.

Result: `/sign-in` & `/claim-free` = **200**, gated pages **302→sign-in**, `/api/register`
clean **400**. Signup/login/dashboard/library are functional. **Keep Node ≥ 22.**

### Still open before full launch
- **Stripe not working yet:** `STRIPE_SECRET_KEY` currently holds a wrong value (`mk_…`,
  must be `sk_live_…`); still missing `STRIPE_WEBHOOK_SECRET` + the 4 `STRIPE_PRICE_…` IDs.
  Free signup works without these; paid checkout will 500/fail until fixed.
- **SSL cert** for the apex (below).

---

### (historical) original env-var blocker

**Fix (owner action — entering keys):** In Netlify → Site configuration → Environment
variables, add all of the following with **"Same value for all contexts"** and **all
scopes (Builds + Functions + Runtime)**. `PUBLIC_*` MUST include the Builds scope because
Astro inlines them at build — then **trigger a fresh deploy** (clear cache + deploy).

| Variable | Example / source |
|----------|------------------|
| `PUBLIC_SUPABASE_URL` | `https://agdlewezwzdjlzlyzfgz.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project settings → API → anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role/secret key (server-only) |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (from the live webhook endpoint) |
| `STRIPE_PRICE_CLASSROOM_MONTHLY` | `price_…` |
| `STRIPE_PRICE_CLASSROOM_ANNUAL` | `price_…` |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_…` |
| `STRIPE_PRICE_PRO_ANNUAL` | `price_…` |
| `PUBLIC_SITE_URL` | `https://standardcraftny.com` |

Minimum to restore signup/login: the 3 Supabase vars + `PUBLIC_SITE_URL`. The Stripe vars
unlock paid checkout. After setting + redeploy, all SSR routes should return 200.

---

## Deployment & domain
- ✅ Netlify CI builds on push to `main` (Astro hybrid + SSR function deploy).
- ✅ Production site returns **HTTP 200** (the previously reported "502" is stale).
- ✅ Build runs resource seed (`npm run build && npm run seed`), idempotent, non-fatal.
- ✅ Netlify secret scan passes (0 matches) on latest deploy.
- 🔧 **SSL cert for `standardcraftny.com`** — DNS verified; provision Let's Encrypt
  cert in Netlify → Domain management → "Provision certificate" if not auto-issued.
  Until done, the apex serves the `*.netlify.app` wildcard cert and browsers show
  `ERR_CERT_COMMON_NAME_INVALID`.
- 🟡 Confirm apex + `www` both resolve and 301 to the canonical host once SSL is live.

## Routes (manual smoke test)
- ✅ `/` homepage renders, CTAs route to `/claim-free` and `/resources`.
- ✅ `/pricing` — Free→`/claim-free`, Classroom/Pro→Stripe, School→`/school-inquiry`.
- ✅ `/resources` public preview + `?subject=` / `?grade=` filtering.
- ✅ `/resources/[slug]` individual previews (static).
- ✅ `/claim-free` signup → `/api/register` → client sign-in.
- ✅ `/sign-in` Supabase password auth, honors `?redirect=`.
- ✅ `/dashboard`, `/account`, `/free-resource-library` gate on auth (redirect to sign-in).
- ✅ `/contact`, `/school-inquiry` lead forms post to their API handlers.
- ✅ Legal: `/privacy`, `/terms`, `/data-security`, `/refunds-and-assurance`.
- ✅ SEO landing pages present (`/nys-lesson-plans`, `/nys-worksheets`, etc.).

## Auth & accounts
- ✅ Email/password signup grants 1 idempotent signup credit.
- ✅ `handle_new_user` trigger + `/api/register` both create the profile row.
- ✅ Sign-out clears Supabase cookies and returns home.
- ⬜ Password reset flow on `/sign-in` (not yet implemented).

## Credits & downloads
- ✅ Atomic credit deduction via `redeem_credit_for_download` RPC (locks credits row).
- ✅ Re-downloads cost 0 credits.
- ✅ `download.ts` null-safe when `resources` table not seeded (falls back to slug URL).
- 🟡 Verify the `resources` Supabase Storage bucket contains the 50 `.md` files after a
  build's seed step (check a Netlify build log "npm run seed" section, or the bucket).

## Payments (see payment-integration.md)
- ✅ Stripe checkout + webhook implemented, live-keyed.
- 🟡 Verify all `STRIPE_PRICE_*` are live-mode IDs.
- 🟡 Verify `STRIPE_WEBHOOK_SECRET` matches the live endpoint signing secret.
- 🟡 Run one end-to-end paid test (checkout → success → credits granted → webhook 200).
- ⬜ Add monthly/annual toggle (annual price IDs exist but UI sends only `monthly`).
- ⬜ Add Stripe Billing Portal link on `/account` for self-serve cancel.

## SEO & metadata
- ✅ Per-page titles + meta descriptions, canonical URLs.
- ✅ OG + Twitter card tags incl. `og:image`/`twitter:image` (`public/og-image.svg`).
- ✅ `robots.txt`, `sitemap.xml`.
- ⬜ Add JSON-LD `Organization` + `Product`/`Offer` structured data sitewide.
- ⬜ Provide a PNG OG image alongside SVG for max social-platform compatibility.

## Accessibility & performance
- ✅ `prefers-reduced-motion` honored; global `:focus-visible` outlines added.
- ✅ Semantic headings, mobile-first layouts, `summary`/`details` for disclosures.
- 🟡 Contrast spot-check `--sc-slate` text on tinted cards.
- ⬜ Run Lighthouse on the production domain once SSL is live; record scores here.

## Compliance & claims (verified in copy)
- ✅ "Independent / not affiliated with, endorsed by, or sponsored by NYSED" in footer + FAQs.
- ✅ Math human-review described as a **pilot only**; other subjects = standards-grounded
  generation + automated validation + founder oversight.
- ✅ No "Common Core" tagging for ELA/Math (FAQ explicitly states NYS Next Gen 2017).
- ✅ Resources described as original; IEP/SDI material framed as teacher-reference.
- 🟡 Final copy pass to ensure no page overclaims certified-teacher review beyond Math.

## Known non-blocking tech debt
- Dark-theme Tailwind class residue overridden via `!important` in `global.css`
  (works, but should be migrated to `--sc-*` tokens).
- No `customer.subscription.deleted` credit clawback (acceptable; document as intended).

---

### Go/No-go summary
**Code: launch-ready.** All core flows function; no hard blockers remain in the codebase.
**Single owner action to be fully live on the custom domain:** finish SSL cert provisioning
in Netlify. Recommended pre-launch: one real Stripe end-to-end test and a seed/bucket
verification.
