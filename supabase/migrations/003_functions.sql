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
