-- ================================================================
-- Atomic RPC: Process Income Allocation (Single & Multi-Bucket)
-- ================================================================
CREATE OR REPLACE FUNCTION public.process_income_allocation(
  p_user_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_note TEXT,
  p_date TIMESTAMP WITH TIME ZONE,
  p_allocation_mode TEXT,
  p_single_bucket_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_bucket RECORD;
  v_allocated_amount NUMERIC;
  v_target_wallet_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  -- 1. Insert Income Transaction
  INSERT INTO public.transactions (
    user_id, wallet_id, bucket_id, type, amount, category, note, transaction_date
  ) VALUES (
    p_user_id, 
    p_wallet_id, 
    CASE WHEN p_allocation_mode = 'single' THEN p_single_bucket_id ELSE NULL END, 
    'income', 
    p_amount, 
    'income', 
    p_note, 
    p_date
  ) RETURNING id INTO v_transaction_id;

  -- 2. Update Destination Wallet Balance (Wallet receiving the money directly)
  IF p_wallet_id IS NOT NULL THEN
    -- Make sure wallet belongs to user
    PERFORM id FROM public.wallets WHERE id = p_wallet_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found or permission denied'; END IF;
    
    UPDATE public.wallets 
    SET balance = balance + p_amount, updated_at = now() 
    WHERE id = p_wallet_id AND user_id = p_user_id;
  END IF;

  -- 3. Allocate to buckets
  IF p_allocation_mode = 'single' AND p_single_bucket_id IS NOT NULL THEN
    -- Single bucket allocation
    -- Verify bucket ownership
    PERFORM id FROM public.buckets WHERE id = p_single_bucket_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bucket not found or permission denied'; END IF;

    INSERT INTO public.allocations (user_id, income_transaction_id, bucket_id, amount)
    VALUES (p_user_id, v_transaction_id, p_single_bucket_id, p_amount);

    UPDATE public.buckets 
    SET balance = balance + p_amount, updated_at = now() 
    WHERE id = p_single_bucket_id;

    -- Check auto-transfer to linked wallet
    SELECT default_wallet_id INTO v_target_wallet_id FROM public.buckets WHERE id = p_single_bucket_id;
    IF v_target_wallet_id IS NOT NULL AND p_wallet_id IS NOT NULL AND v_target_wallet_id <> p_wallet_id THEN
      PERFORM public.process_transfer(p_user_id, p_wallet_id, v_target_wallet_id, p_amount, 0, 'โอนเข้าบัญชีที่ผูกไว้อัตโนมัติ', p_date);
    END IF;
  ELSE
    -- Auto allocation (Percentage-based)
    FOR v_bucket IN SELECT id, allocation_percentage, default_wallet_id FROM public.buckets WHERE user_id = p_user_id AND is_archived = false FOR UPDATE LOOP
      v_allocated_amount := (p_amount * v_bucket.allocation_percentage) / 100.0;
      IF v_allocated_amount > 0 THEN
        INSERT INTO public.allocations (user_id, income_transaction_id, bucket_id, amount)
        VALUES (p_user_id, v_transaction_id, v_bucket.id, v_allocated_amount);

        UPDATE public.buckets 
        SET balance = balance + v_allocated_amount, updated_at = now() 
        WHERE id = v_bucket.id;

        IF v_bucket.default_wallet_id IS NOT NULL AND p_wallet_id IS NOT NULL AND v_bucket.default_wallet_id <> p_wallet_id THEN
          PERFORM public.process_transfer(p_user_id, p_wallet_id, v_bucket.default_wallet_id, v_allocated_amount, 0, 'จัดสรรรายรับอัตโนมัติ', p_date);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
