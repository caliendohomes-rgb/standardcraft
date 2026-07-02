-- Atomic subscription credit grant — makes Stripe webhook retries safe.
-- Replaces the two-step JS grant (ledger insert, then balance increment) whose
-- partial failure could permanently skip a paid grant on redelivery.

-- Dedup guard for period keys. If this index fails to create, duplicate
-- (user_id, stripe_session_id) rows exist — dedupe them first:
--   DELETE FROM credit_ledger a USING credit_ledger b
--   WHERE a.id > b.id AND a.user_id = b.user_id
--     AND a.stripe_session_id = b.stripe_session_id
--     AND a.stripe_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_period_key_uidx
  ON public.credit_ledger (user_id, stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.grant_subscription_credits(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_description TEXT,
  p_period_key  TEXT
)
RETURNS BOOLEAN  -- true = granted, false = already granted this period
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
GRANT EXECUTE ON FUNCTION public.grant_subscription_credits TO service_role;
