-- ================================================================
-- 🌟 Smart Pocket - Milestone 6: Multi-Wallet & Transfers Schema
-- ================================================================

-- 1. Create Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'credit')),
  bank_name TEXT, -- เช่น 'kbank', 'scb', 'bbl', 'ktb', 'ttb', 'bay', 'gsb', 'promptpay'
  color TEXT NOT NULL DEFAULT '#10B981',
  icon TEXT DEFAULT 'wallet',
  opening_balance NUMERIC(15,2) DEFAULT 0 NOT NULL,
  balance NUMERIC(15,2) DEFAULT 0 NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets" 
  ON public.wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets" 
  ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets" 
  ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets" 
  ON public.wallets FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_archived ON public.wallets(user_id, is_archived);

-- Trigger: update updated_at on wallets
CREATE TRIGGER update_wallets_updated_at 
  BEFORE UPDATE ON public.wallets 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ================================================================
-- 2. Alter Transactions Table to Support Wallets & Transfers
-- ================================================================
DO $$ 
BEGIN
  -- Add wallet_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'wallet_id') THEN
    ALTER TABLE public.transactions ADD COLUMN wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
  END IF;

  -- Add to_wallet_id column (used for transfer transactions)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'to_wallet_id') THEN
    ALTER TABLE public.transactions ADD COLUMN to_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
  END IF;

  -- Add transfer_fee column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transfer_fee') THEN
    ALTER TABLE public.transactions ADD COLUMN transfer_fee NUMERIC(15,2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet_id ON public.transactions(to_wallet_id);

-- ================================================================
-- 3. Alter Recurring Schedules Table to Support Wallets
-- ================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_schedules') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_schedules' AND column_name = 'wallet_id') THEN
      ALTER TABLE public.recurring_schedules ADD COLUMN wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ================================================================
-- 4. Data Migration: Auto-create Default Wallet for Existing Users
-- ================================================================
DO $$
DECLARE
  r_user RECORD;
  v_wallet_id UUID;
  v_net_income NUMERIC;
  v_net_expense NUMERIC;
  v_initial_balance NUMERIC;
BEGIN
  FOR r_user IN SELECT id FROM public.profiles LOOP
    -- ตรวจสอบว่ามี wallet หรือยัง
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = r_user.id AND is_default = true LIMIT 1;
    
    IF v_wallet_id IS NULL THEN
      -- คำนวณยอดเงินคงเหลือจากประวัติเก่าที่ไม่ได้ถูกลบ (deleted_at IS NULL)
      SELECT COALESCE(SUM(amount), 0) INTO v_net_income 
      FROM public.transactions 
      WHERE user_id = r_user.id AND type = 'income' AND deleted_at IS NULL;

      SELECT COALESCE(SUM(amount), 0) INTO v_net_expense 
      FROM public.transactions 
      WHERE user_id = r_user.id AND type = 'expense' AND deleted_at IS NULL;

      v_initial_balance := v_net_income - v_net_expense;

      -- สร้างกระเป๋าเริ่มต้น
      INSERT INTO public.wallets (
        user_id,
        name,
        type,
        color,
        icon,
        opening_balance,
        balance,
        is_default
      ) VALUES (
        r_user.id,
        'บัญชีหลัก / เงินสด',
        'cash',
        '#10B981',
        'wallet',
        0,
        v_initial_balance,
        true
      ) RETURNING id INTO v_wallet_id;

      -- ผูก transactions เก่าที่ยังไม่มี wallet_id เข้ากับกระเป๋านี้
      UPDATE public.transactions 
      SET wallet_id = v_wallet_id 
      WHERE user_id = r_user.id AND wallet_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ================================================================
-- 5. Automation: Update handle_new_user to Create Default Wallet
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- 2. Auto-create 3 Default Buckets (เงินสำรองฉุกเฉิน, เงินลงทุน, ค่ากิน/ใช้ชีวิต)
  INSERT INTO public.buckets (user_id, name, icon, color, allocation_percentage)
  VALUES 
    (new.id, 'เงินสำรองฉุกเฉิน', 'shield', '#F59E0B', 20),
    (new.id, 'เงินลงทุน', 'trending-up', '#10B981', 30),
    (new.id, 'เงินใช้ชีวิตประจำวัน', 'coffee', '#3B82F6', 50);

  -- 3. Auto-create Default Wallet (บัญชีหลัก / เงินสด)
  INSERT INTO public.wallets (user_id, name, type, color, icon, opening_balance, balance, is_default)
  VALUES (new.id, 'บัญชีหลัก / เงินสด', 'cash', '#10B981', 'wallet', 0, 0, true);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. Atomic RPC: Process Transfer Between Wallets
-- ================================================================
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

  -- 2. Lock and Check Source Wallet
  SELECT balance INTO v_from_balance 
  FROM public.wallets 
  WHERE id = p_from_wallet_id AND user_id = p_user_id 
  FOR UPDATE;

  IF v_from_balance IS NULL THEN
    RAISE EXCEPTION 'Source wallet not found or permission denied';
  END IF;

  -- 3. Lock and Check Destination Wallet
  SELECT balance INTO v_to_balance 
  FROM public.wallets 
  WHERE id = p_to_wallet_id AND user_id = p_user_id 
  FOR UPDATE;

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

-- ================================================================
-- 7. Atomic RPC: Process Expense with Wallet
-- ================================================================
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
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- 1. Check & Lock Bucket
  SELECT balance INTO v_current_balance FROM public.buckets WHERE id = p_bucket_id AND user_id = p_user_id FOR UPDATE;
  IF v_current_balance IS NULL THEN RAISE EXCEPTION 'Bucket not found'; END IF;

  -- 2. Determine Wallet
  IF v_target_wallet_id IS NULL THEN
    SELECT id INTO v_target_wallet_id FROM public.wallets WHERE user_id = p_user_id AND is_default = true LIMIT 1;
    IF v_target_wallet_id IS NULL THEN
      SELECT id INTO v_target_wallet_id FROM public.wallets WHERE user_id = p_user_id LIMIT 1;
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

-- ================================================================
-- 8. Update Trash System to Support Wallets
-- ================================================================
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
