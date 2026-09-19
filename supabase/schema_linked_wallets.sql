-- ================================================================
-- 🌟 Smart Pocket - Milestone 6.1: Linked Wallets (Auto-Transfer)
-- ================================================================

-- 1. Add default_wallet_id to buckets table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'buckets' AND column_name = 'default_wallet_id') THEN
    ALTER TABLE public.buckets ADD COLUMN default_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Update process_expense RPC to auto-select default_wallet_id if not provided
CREATE OR REPLACE FUNCTION public.process_expense(
  p_user_id UUID, 
  p_bucket_id UUID, 
  p_amount NUMERIC, 
  p_category TEXT, 
  p_note TEXT, 
  p_date TIMESTAMP WITH TIME ZONE, 
  p_slip_url TEXT DEFAULT NULL, 
  p_receiver TEXT DEFAULT NULL,
  p_wallet_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID; 
  v_current_balance NUMERIC;
  v_target_wallet_id UUID := p_wallet_id;
  v_bucket_default_wallet UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- 1. Check & Lock Bucket
  SELECT balance, default_wallet_id INTO v_current_balance, v_bucket_default_wallet 
  FROM public.buckets WHERE id = p_bucket_id AND user_id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL THEN RAISE EXCEPTION 'Bucket not found'; END IF;

  -- 2. Determine Wallet
  IF v_target_wallet_id IS NULL THEN
    -- ลองใช้ default_wallet_id ของถังงบก่อน
    v_target_wallet_id := v_bucket_default_wallet;
    
    -- ถ้าไม่มี ค่อยไปหากระเป๋าหลัก (is_default)
    IF v_target_wallet_id IS NULL THEN
      SELECT id INTO v_target_wallet_id FROM public.wallets WHERE user_id = p_user_id AND is_default = true LIMIT 1;
      -- ถ้ายังไม่มีอีก เอาใบแรกที่เจอ
      IF v_target_wallet_id IS NULL THEN
        SELECT id INTO v_target_wallet_id FROM public.wallets WHERE user_id = p_user_id LIMIT 1;
      END IF;
    END IF;
  END IF;

  -- 3. Update Wallet Balance if found
  IF v_target_wallet_id IS NOT NULL THEN
    UPDATE public.wallets 
    SET balance = balance - p_amount, updated_at = now() 
    WHERE id = v_target_wallet_id AND user_id = p_user_id;
  END IF;

  -- 4. Insert Transaction
  INSERT INTO public.transactions (
    user_id, bucket_id, wallet_id, type, amount, category, note, transaction_date, slip_url, receiver
  ) VALUES (
    p_user_id, p_bucket_id, v_target_wallet_id, 'expense', p_amount, p_category, p_note, p_date, p_slip_url, p_receiver
  ) RETURNING id INTO v_transaction_id;

  -- 5. Deduct Bucket Balance
  UPDATE public.buckets 
  SET balance = balance - p_amount, updated_at = now() 
  WHERE id = p_bucket_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
