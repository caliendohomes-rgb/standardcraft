# StandardCraft

NYS Next Generation standards-aligned classroom resources â€” production-ready full-stack Astro v4 site.

## Stack

- **Frontend**: Astro v4 (`output: 'hybrid'`), Tailwind CSS
- **Auth + DB + Storage**: Supabase (Postgres + Auth + Storage + RLS)
- **Payments**: Stripe (Checkout + Webhooks)
- **Hosting**: Netlify (SSR via `@astrojs/netlify` adapter)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key â€” **never expose to browser** |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_CLASSROOM_MONTHLY` | Stripe Price ID for Classroom monthly |
| `STRIPE_PRICE_CLASSROOM_ANNUAL` | Stripe Price ID for Classroom annual |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe Price ID for Pro monthly |
| `STRIPE_PRICE_PRO_ANNUAL` | Stripe Price ID for Pro annual |
| `PUBLIC_SITE_URL` | Your site URL (e.g. `https://standardcraftny.com`) |

### 3. Run dev server

```bash
npm run dev
```

---

## Supabase Setup

### Create project

1. Go to [supabase.com](https://supabase.com) â†’ New project
2. Copy your Project URL and API keys into `.env`

### Run migrations

In the Supabase dashboard â†’ **SQL Editor**, run the three migration files in order:

```
supabase/migrations/001_schema.sql    # Tables + triggers
supabase/migrations/002_rls.sql       # Row Level Security policies
supabase/migrations/003_functions.sql # Atomic credit functions
```

### Create Storage bucket

1. Dashboard â†’ **Storage** â†’ **New bucket**
2. Name: `resources`
3. **Public**: OFF (private â€” files delivered via signed URLs only)

### Disable email confirmation

Dashboard â†’ **Authentication** â†’ **Email** â†’ turn off "Confirm email" for frictionless signup.

---

## Seed Resources

After Supabase is configured and the `resources` bucket exists:

```bash
npm run seed:dry   # Preview â€” no changes
npm run seed       # Live upload + DB seed
```

The seed script reads all `.md` files from `src/content/resources/`, uploads them to the `resources` Storage bucket, and upserts metadata into `public.resources`.

---

## Stripe Setup

### Create products and prices

1. Dashboard â†’ **Products** â†’ Add **Classroom** ($29/mo) and **Pro** ($69/mo)
2. Create recurring monthly prices for each; copy Price IDs into `.env`

### Configure webhook

1. Dashboard â†’ **Developers** â†’ **Webhooks** â†’ Add endpoint
2. URL: `https://your-site.netlify.app/api/webhook`
3. Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret â†’ `STRIPE_WEBHOOK_SECRET`

---

## Netlify Deployment

1. Push to GitHub
2. Netlify â†’ **Add site** â†’ Import from Git
3. Build settings are pre-configured in `netlify.toml`
4. In Netlify â†’ **Environment variables**, add all variables from `.env`

> `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-side only â€” never set as `PUBLIC_` prefixed variables.

---

## Project Structure

```
src/
  content/resources/      # 50 NYS-aligned .md resource files (SC-001 to SC-050)
  lib/
    supabase.ts           # Browser Supabase client (singleton)
    supabase-server.ts    # SSR + admin Supabase clients
    stripe.ts             # Stripe factory + plan constants
  middleware.ts           # Session refresh middleware
  layouts/Layout.astro    # Shared layout with auth-aware nav
  pages/
    index.astro           # Homepage (static)
    resources/            # Public resource library (static)
    claim-free.astro      # Registration (SSR)
    signin.astro          # Sign in (SSR)
    free-resource-library.astro  # Protected library (SSR)
    dashboard.astro       # Protected dashboard (SSR)
    pricing.astro         # Pricing (static)
    account.astro         # Account settings (SSR)
    contact.astro         # Contact form (static)
    privacy.astro         # Privacy policy
    terms.astro           # Terms of service
    data-security.astro   # Data security
    refunds-and-assurance.astro
    school-inquiry.astro  # School/district inquiry
    api/
      register.ts         # POST: create account + grant 1 credit
      signout.ts          # POST: sign out + clear cookies
      download.ts         # POST: verify auth + credits â†’ signed URL
      checkout.ts         # POST: create Stripe Checkout session
      webhook.ts          # POST: Stripe webhook handler
      school-inquiry.ts   # POST: save inquiry
      contact.ts          # POST: save contact message
supabase/migrations/      # SQL migrations (run in order)
scripts/seed-resources.js # Upload 50 resources to Supabase Storage
public/robots.txt
```

---

## User Flow

```
/ â†’ /claim-free â†’ POST /api/register â†’ sign in â†’ /free-resource-library
                                                      â””â”€â”€ Download â†’ POST /api/download â†’ signed URL
                                                      â””â”€â”€ (no credits) â†’ /pricing â†’ POST /api/checkout â†’ Stripe
                                                                                         â””â”€â”€ success â†’ /dashboard
```

---

## Brand Compliance

- Not affiliated with, endorsed by, or sponsored by NYSED
- ELA: NYS Next Generation ELA Standards (2017) â€” not tagged as Common Core
- Math: NYS Next Generation Mathematics Learning Standards (2017) â€” not tagged as Common Core
- No standard code is ever invented â€” all codes verified against official NYSED source documents

