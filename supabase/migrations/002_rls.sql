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
