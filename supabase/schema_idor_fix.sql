-- =========================================================================

-- 🛡️ Security Patch: Fix IDOR Vulnerability in RPCs (Enforce auth.uid() Check)

-- =========================================================================


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



CREATE OR REPLACE FUNCTION public.move_to_trash(p_tx_id UUID, p_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- ทำความสะอาดถังขยะ: ลบข้อมูลทิ้งถาวรหากลบเกิน 3 วัน
  DELETE FROM public.transactions WHERE user_id = p_user_id AND deleted_at < NOW() - INTERVAL '3 days';

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id AND user_id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- คืนเงินเข้า Bucket และ Wallet
  IF v_tx.type = 'expense' THEN
    IF v_tx.bucket_id IS NOT NULL THEN
      UPDATE public.buckets SET balance = balance + v_tx.amount WHERE id = v_tx.bucket_id;
    END IF;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'income' THEN
    FOR v_alloc IN SELECT bucket_id, amount FROM public.allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE public.buckets SET balance = balance - v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'transfer' THEN
    -- คืนเงินให้กระเป๋าต้นทาง และหักออกจากกระเป๋าปลายทาง
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + (v_tx.amount + COALESCE(v_tx.transfer_fee, 0)) WHERE id = v_tx.wallet_id;
    END IF;
    IF v_tx.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount WHERE id = v_tx.to_wallet_id;
    END IF;
  END IF;

  -- ย้ายลงถังขยะ
  UPDATE public.transactions SET deleted_at = NOW() WHERE id = p_tx_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



CREATE OR REPLACE FUNCTION public.restore_from_trash(p_tx_id UUID, p_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.transactions WHERE user_id = p_user_id AND deleted_at < NOW() - INTERVAL '3 days';

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_tx_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- หัก/เพิ่มเงินกลับตามประเภทรายการ
  IF v_tx.type = 'expense' THEN
    IF v_tx.bucket_id IS NOT NULL THEN
      UPDATE public.buckets SET balance = balance - v_tx.amount WHERE id = v_tx.bucket_id;
    END IF;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'income' THEN
    FOR v_alloc IN SELECT bucket_id, amount FROM public.allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE public.buckets SET balance = balance + v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'transfer' THEN
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - (v_tx.amount + COALESCE(v_tx.transfer_fee, 0)) WHERE id = v_tx.wallet_id;
    END IF;
    IF v_tx.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount WHERE id = v_tx.to_wallet_id;
    END IF;
  END IF;

  -- กู้คืน (ล้างค่า deleted_at)
  UPDATE public.transactions SET deleted_at = NULL WHERE id = p_tx_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



CREATE OR REPLACE FUNCTION process_due_recurring_transactions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
  v_tx_id UUID;
  v_allocated_amount NUMERIC;
  v_bucket RECORD;
  v_processed_count INT := 0;
  v_total_expense NUMERIC := 0;
  v_total_income NUMERIC := 0;
  v_processed_ids UUID[] := ARRAY[]::UUID[];
  v_next_date DATE;
  v_next_month_first DATE;
  v_days_in_next_month INT;
  v_target_day INT;
  v_next_year INT;
  v_month INT;
  v_day INT;
  v_tx_timestamp TIMESTAMPTZ;
  v_iter INT;
BEGIN
  -- 1. Security Check (IDOR Guard)
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- 2. Iterate through all active, due schedules with row-level lock
  FOR v_rec IN 
    SELECT * FROM recurring_schedules
    WHERE user_id = p_user_id 
      AND is_active = true 
      AND auto_process = true 
      AND next_run_date <= CURRENT_DATE
      AND (end_date IS NULL OR next_run_date <= end_date)
    FOR UPDATE
  LOOP
    v_iter := 0;

    -- Catch-up loop: process all due dates up to CURRENT_DATE (safety cap: 36 iterations)
    WHILE v_rec.next_run_date <= CURRENT_DATE AND (v_rec.end_date IS NULL OR v_rec.next_run_date <= v_rec.end_date) AND v_iter < 36 LOOP
      v_iter := v_iter + 1;
      v_tx_timestamp := (v_rec.next_run_date::text || ' 12:00:00+07')::timestamptz;

      -- A. Handle Expense
      IF v_rec.type = 'expense' THEN
        -- Verify bucket exists or pick user's first bucket if bucket_id is null
        IF v_rec.bucket_id IS NULL THEN
          SELECT id INTO v_rec.bucket_id FROM buckets WHERE user_id = p_user_id LIMIT 1;
        END IF;

        IF v_rec.bucket_id IS NOT NULL THEN
          -- 1. Insert into transactions
          INSERT INTO transactions (
            user_id, bucket_id, type, amount, category, note, transaction_date, recurring_schedule_id
          ) VALUES (
            p_user_id,
            v_rec.bucket_id,
            'expense',
            v_rec.amount,
            COALESCE(v_rec.category, 'ค่าใช้จ่ายประจำ'),
            COALESCE(v_rec.note, 'รายการประจำอัตโนมัติ'),
            v_tx_timestamp,
            v_rec.id
          ) RETURNING id INTO v_tx_id;

          -- 2. Deduct from bucket balance (allowing negative balance per specification)
          UPDATE buckets 
          SET balance = balance - v_rec.amount,
              updated_at = now()
          WHERE id = v_rec.bucket_id;

          v_total_expense := v_total_expense + v_rec.amount;
        END IF;

      -- B. Handle Income
      ELSIF v_rec.type = 'income' THEN
        -- 1. Insert into transactions
        INSERT INTO transactions (
          user_id, bucket_id, type, amount, category, note, transaction_date, recurring_schedule_id
        ) VALUES (
          p_user_id,
          NULL,
          'income',
          v_rec.amount,
          COALESCE(v_rec.category, 'รายรับประจำ'),
          COALESCE(v_rec.note, 'รายรับประจำอัตโนมัติ'),
          v_tx_timestamp,
          v_rec.id
        ) RETURNING id INTO v_tx_id;

        -- 2. Allocate to buckets according to allocation_percentage
        FOR v_bucket IN 
          SELECT id, allocation_percentage, balance FROM buckets WHERE user_id = p_user_id 
        LOOP
          v_allocated_amount := ROUND((v_rec.amount * v_bucket.allocation_percentage) / 100.0, 2);
          IF v_allocated_amount > 0 THEN
            INSERT INTO allocations (user_id, income_transaction_id, bucket_id, amount)
            VALUES (p_user_id, v_tx_id, v_bucket.id, v_allocated_amount);

            UPDATE buckets 
            SET balance = balance + v_allocated_amount,
                updated_at = now()
            WHERE id = v_bucket.id;
          END IF;
        END LOOP;

        v_total_income := v_total_income + v_rec.amount;
      END IF;

      -- Track processed stats
      v_processed_count := v_processed_count + 1;
      IF NOT (v_rec.id = ANY(v_processed_ids)) THEN
        v_processed_ids := array_append(v_processed_ids, v_rec.id);
      END IF;

      -- C. Calculate Next Run Date with Clamping
      IF v_rec.frequency = 'daily' THEN
        v_next_date := v_rec.next_run_date + INTERVAL '1 day';

      ELSIF v_rec.frequency = 'weekly' THEN
        v_next_date := v_rec.next_run_date + INTERVAL '7 days';

      ELSIF v_rec.frequency = 'monthly' THEN
        v_next_month_first := (date_trunc('month', v_rec.next_run_date) + INTERVAL '1 month')::date;
        v_days_in_next_month := EXTRACT(DAY FROM (date_trunc('month', v_next_month_first) + INTERVAL '1 month - 1 day'))::int;
        v_target_day := LEAST(COALESCE(v_rec.day_of_month, EXTRACT(DAY FROM v_rec.next_run_date)::int), v_days_in_next_month);
        v_next_date := v_next_month_first + (v_target_day - 1) * INTERVAL '1 day';

      ELSIF v_rec.frequency = 'yearly' THEN
        v_next_year := EXTRACT(YEAR FROM v_rec.next_run_date)::int + 1;
        v_month := EXTRACT(MONTH FROM v_rec.next_run_date)::int;
        v_day := EXTRACT(DAY FROM v_rec.next_run_date)::int;
        -- Leap year clamping for Feb 29
        IF v_month = 2 AND v_day = 29 THEN
          IF NOT ((v_next_year % 4 = 0 AND v_next_year % 100 <> 0) OR (v_next_year % 400 = 0)) THEN
            v_day := 28;
          END IF;
        END IF;
        v_next_date := make_date(v_next_year, v_month, v_day);
      ELSE
        v_next_date := v_rec.next_run_date + INTERVAL '1 month';
      END IF;

      -- Update the schedule record in memory and in DB
      UPDATE recurring_schedules 
      SET last_run_date = v_rec.next_run_date,
          next_run_date = v_next_date,
          is_active = CASE 
            WHEN v_rec.end_date IS NOT NULL AND v_next_date > v_rec.end_date THEN false 
            ELSE is_active 
          END,
          updated_at = now()
      WHERE id = v_rec.id;

      -- Advance local variable for catch-up loop
      v_rec.next_run_date := v_next_date;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'processed_count', v_processed_count,
    'total_expense', v_total_expense,
    'total_income', v_total_income,
    'processed_schedule_ids', v_processed_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;