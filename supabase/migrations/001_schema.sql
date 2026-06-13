-- StandardCraft Database Schema
-- Run in Supabase SQL Editor (Project Settings > SQL Editor)

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subjects           TEXT[] NOT NULL DEFAULT '{}',
  grade_levels       TEXT[] NOT NULL DEFAULT '{}',
  marketing_consent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- 3. credits
CREATE TABLE IF NOT EXISTS public.credits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance          INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned  INTEGER NOT NULL DEFAULT 0,
  lifetime_spent   INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- 4. credit_ledger
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('signup_bonus', 'subscription', 'redemption', 'refund', 'manual')),
  description       TEXT,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. resources
CREATE TABLE IF NOT EXISTS public.resources (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  grade          TEXT NOT NULL,
  grade_band     TEXT,
  resource_type  TEXT NOT NULL,
  standards      JSONB NOT NULL DEFAULT '[]',
  file_path      TEXT NOT NULL,
  credit_cost    INTEGER NOT NULL DEFAULT 1 CHECK (credit_cost > 0),
  status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'blocked')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. downloads
CREATE TABLE IF NOT EXISTS public.downloads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id    UUID REFERENCES public.resources(id),
  resource_slug  TEXT NOT NULL,
  downloaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS downloads_user_id_idx ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS downloads_resource_slug_idx ON public.downloads(resource_slug);
CREATE UNIQUE INDEX IF NOT EXISTS downloads_user_resource_unique ON public.downloads(user_id, resource_slug);

-- 7. subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT UNIQUE,
  plan                     TEXT NOT NULL CHECK (plan IN ('classroom', 'pro', 'school')),
  status                   TEXT NOT NULL DEFAULT 'active',
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- 8. school_inquiries
CREATE TABLE IF NOT EXISTS public.school_inquiries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  school_or_district  TEXT,
  role_title          TEXT,
  estimated_teachers  TEXT,
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'new',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. contact_messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  subject     TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
