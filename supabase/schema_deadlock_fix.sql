-- =========================================================================
-- 🛡️ Security Patch: Fix Deadlock Vulnerability in process_transfer
-- =========================================================================

CREATE OR REPLACE FUNCTION public.process_transfer(
  p_user_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_fee NUMERIC DEFAULT 0,
  p_note TEXT DEFAULT NULL,
  p_date TIMESTAMP WITH TIME ZONE DEFAULT now()
) RETURNS UUID AS $$
DECLARE
  v_transfer_id UUID;
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_total_deduct NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  -- 1. Basic Validations
  IF p_from_wallet_id = p_to_wallet_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same wallet';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero';
  END IF;

  IF p_fee IS NULL OR p_fee < 0 THEN
    p_fee := 0;
  END IF;

  v_total_deduct := p_amount + p_fee;

  -- 2. Lock Wallets in Consistent Order to Prevent Deadlocks
  -- Always lock the wallet with the smaller UUID first
  IF p_from_wallet_id < p_to_wallet_id THEN
    SELECT balance INTO v_from_balance 
    FROM public.wallets 
    WHERE id = p_from_wallet_id AND user_id = p_user_id 
    FOR UPDATE;

    SELECT balance INTO v_to_balance 
    FROM public.wallets 
    WHERE id = p_to_wallet_id AND user_id = p_user_id 
    FOR UPDATE;
  ELSE
    SELECT balance INTO v_to_balance 
    FROM public.wallets 
    WHERE id = p_to_wallet_id AND user_id = p_user_id 
    FOR UPDATE;

    SELECT balance INTO v_from_balance 
    FROM public.wallets 
    WHERE id = p_from_wallet_id AND user_id = p_user_id 
    FOR UPDATE;
  END IF;

  -- 3. Check if both wallets exist and belong to the user
  IF v_from_balance IS NULL THEN
    RAISE EXCEPTION 'Source wallet not found or permission denied';
  END IF;

  IF v_to_balance IS NULL THEN
    RAISE EXCEPTION 'Destination wallet not found or permission denied';
  END IF;

  -- 4. Deduct from Source Wallet (Amount + Fee)
  UPDATE public.wallets 
  SET balance = balance - v_total_deduct, updated_at = now() 
  WHERE id = p_from_wallet_id;

  -- 5. Add to Destination Wallet (Amount)
  UPDATE public.wallets 
  SET balance = balance + p_amount, updated_at = now() 
  WHERE id = p_to_wallet_id;

  -- 6. Insert Transfer Transaction Record
  INSERT INTO public.transactions (
    user_id,
    wallet_id,
    to_wallet_id,
    type,
    amount,
    transfer_fee,
    category,
    note,
    transaction_date
  ) VALUES (
    p_user_id,
    p_from_wallet_id,
    p_to_wallet_id,
    'transfer',
    p_amount,
    p_fee,
    'โอนเงินระหว่างบัญชี',
    p_note,
    p_date
  ) RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.process_transfer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_transfer TO authenticated;
