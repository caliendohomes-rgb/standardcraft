/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  // Public (exposed to client-side bundles)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_SITE_URL: string;

  // Private — server-only, never sent to the browser
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_PRICE_CLASSROOM_MONTHLY: string;
  readonly STRIPE_PRICE_CLASSROOM_ANNUAL: string;
  readonly STRIPE_PRICE_PRO_MONTHLY: string;
  readonly STRIPE_PRICE_PRO_ANNUAL: string;
  readonly SMTP_USER: string;
  readonly SMTP_PASS: string;
  readonly SMTP_HOST: string;
  readonly SMTP_PORT: string;
  readonly EMAIL_FROM: string;
  readonly CONTACT_NOTIFICATION_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
