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

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_normalized_unique
  ON public.profiles (LOWER(email));

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

CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_one_signup_bonus_per_user
  ON public.credit_ledger (user_id)
  WHERE type = 'signup_bonus';

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

-- Auto-create profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- StandardCraft Row Level Security Policies
-- Run AFTER 001_schema.sql

-- Enable RLS on all user-facing tables
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
-- school_inquiries and contact_messages: service-role only (no user policies needed)
ALTER TABLE public.school_inquiries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages  ENABLE ROW LEVEL SECURITY;

-- profiles: users can read and update their own row
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_preferences: users can read and update their own row
CREATE POLICY "prefs_select_own" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "prefs_update_own" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- credits: users can read their own balance (writes via service role only)
CREATE POLICY "credits_select_own" ON public.credits
  FOR SELECT USING (auth.uid() = user_id);

-- credit_ledger: users can read their own ledger (inserts via service role only)
CREATE POLICY "ledger_select_own" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- resources: published resources are readable by all authenticated users
CREATE POLICY "resources_select_published" ON public.resources
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND status = 'published'
  );

-- downloads: users can read their own download history
CREATE POLICY "downloads_select_own" ON public.downloads
  FOR SELECT USING (auth.uid() = user_id);

-- subscriptions: users can read their own subscription
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- school_inquiries and contact_messages: only service role can insert/select
-- (no authenticated user policies — forms submit via server-side API routes)
-- StandardCraft PostgreSQL Functions
-- Run AFTER 002_rls.sql

-- Atomic credit redemption for downloads
-- Returns JSON: { success: true } or { success: false, error: '...' }
CREATE OR REPLACE FUNCTION public.redeem_credit_for_download(
  p_user_id     UUID,
  p_resource_id UUID,
  p_resource_slug TEXT,
  p_credit_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
  v_existing_download UUID;
BEGIN
  -- Lock the credits row to prevent concurrent double-spend
  SELECT balance INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No credit record found.');
  END IF;

  SELECT id INTO v_existing_download
  FROM public.downloads
  WHERE user_id = p_user_id
    AND resource_slug = p_resource_slug;

  IF v_existing_download IS NOT NULL THEN
    RETURN json_build_object('success', true, 'redownload', true);
  END IF;

  IF v_balance < p_credit_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits.');
  END IF;

  -- Deduct credits
  UPDATE public.credits
  SET
    balance        = balance - p_credit_cost,
    lifetime_spent = lifetime_spent + p_credit_cost,
    updated_at     = NOW()
  WHERE user_id = p_user_id;

  -- Record in credit ledger
  INSERT INTO public.credit_ledger (user_id, amount, type, description)
  VALUES (p_user_id, -p_credit_cost, 'redemption', 'Download: ' || p_resource_slug);

  -- Record the download (ignore if already exists — re-download path handled in API)
  INSERT INTO public.downloads (user_id, resource_id, resource_slug)
  VALUES (p_user_id, p_resource_id, p_resource_slug)
  ON CONFLICT (user_id, resource_slug) DO NOTHING;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Increment credits (used by webhook for subscription renewals)
CREATE OR REPLACE FUNCTION public.increment_credits(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.credits
  SET
    balance        = balance + p_amount,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at     = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, p_amount, p_amount, 0);
  END IF;
END;
$$;

-- Grant execute to authenticated users on redeem function only
-- (increment_credits is service-role only via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.redeem_credit_for_download FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_credit_for_download TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_credits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_credits TO service_role;
