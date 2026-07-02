-- ============================================================================
-- StandardCraft — apply migrations 004 + 005 in one paste
-- Safe to run once or repeatedly: every statement is idempotent.
-- Paste the whole file into Supabase → SQL Editor → Run.
-- ============================================================================

-- ---------- 004: audit_log (SOC 2 CC6.1 / CC7.2) ----------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type      TEXT        NOT NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY has no IF NOT EXISTS; guard it so re-runs don't error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_log'
      AND policyname = 'service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON audit_log
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ---------- 005: atomic subscription credit grant ---------------------------
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_period_key_uidx
  ON public.credit_ledger (user_id, stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.grant_subscription_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_description TEXT,
  p_period_key  TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.credit_ledger (user_id, amount, type, description, stripe_session_id)
  VALUES (p_user_id, p_amount, 'subscription', p_description, p_period_key)
  ON CONFLICT (user_id, stripe_session_id) WHERE stripe_session_id IS NOT NULL
  DO NOTHING;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.credits
  SET
    balance         = balance + p_amount,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at      = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (p_user_id, p_amount, p_amount, 0);
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_subscription_credits FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.grant_subscription_credits TO service_role;

-- ---------- 006: lesson_suggestions (registered-user roadmap feature) --------
CREATE TABLE IF NOT EXISTS public.lesson_suggestions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  subject      TEXT,
  grade_level  TEXT,
  standard     TEXT,
  description  TEXT        NOT NULL,
  upvotes      INTEGER     NOT NULL DEFAULT 0,
  status       TEXT        NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'reviewing', 'planned', 'published', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_suggestions_user_id_idx ON public.lesson_suggestions (user_id);
CREATE INDEX IF NOT EXISTS lesson_suggestions_status_idx  ON public.lesson_suggestions (status);

ALTER TABLE public.lesson_suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_suggestions'
      AND policyname = 'lesson_suggestions_select_own'
  ) THEN
    CREATE POLICY "lesson_suggestions_select_own" ON public.lesson_suggestions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------- verification (should return all four rows, ok = true) -----------
SELECT 'audit_log table'          AS check, to_regclass('public.audit_log')                 IS NOT NULL AS ok
UNION ALL
SELECT 'period-key uniq idx',     to_regclass('public.credit_ledger_period_key_uidx')       IS NOT NULL
UNION ALL
SELECT 'grant fn',                EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'grant_subscription_credits')
UNION ALL
SELECT 'lesson_suggestions table', to_regclass('public.lesson_suggestions')                 IS NOT NULL;
