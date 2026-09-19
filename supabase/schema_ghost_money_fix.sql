-- =========================================================================
-- 🛡️ Bug Fix: Ghost Money (Force un-archive wallet on balance update from trash/restore)
-- =========================================================================

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

  -- คืนเงินเข้า Bucket และ Wallet พร้อม Force Unarchive
  IF v_tx.type = 'expense' THEN
    IF v_tx.bucket_id IS NOT NULL THEN
      UPDATE public.buckets SET balance = balance + v_tx.amount WHERE id = v_tx.bucket_id;
    END IF;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount, is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'income' THEN
    FOR v_alloc IN SELECT bucket_id, amount FROM public.allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE public.buckets SET balance = balance - v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount, is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'transfer' THEN
    -- คืนเงินให้กระเป๋าต้นทาง และหักออกจากกระเป๋าปลายทาง พร้อม Force Unarchive
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + (v_tx.amount + COALESCE(v_tx.transfer_fee, 0)), is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
    IF v_tx.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount, is_archived = false WHERE id = v_tx.to_wallet_id;
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

  -- หัก/เพิ่มเงินกลับตามประเภทรายการ พร้อม Force Unarchive
  IF v_tx.type = 'expense' THEN
    IF v_tx.bucket_id IS NOT NULL THEN
      UPDATE public.buckets SET balance = balance - v_tx.amount WHERE id = v_tx.bucket_id;
    END IF;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - v_tx.amount, is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'income' THEN
    FOR v_alloc IN SELECT bucket_id, amount FROM public.allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE public.buckets SET balance = balance + v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount, is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
  ELSIF v_tx.type = 'transfer' THEN
    IF v_tx.wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance - (v_tx.amount + COALESCE(v_tx.transfer_fee, 0)), is_archived = false WHERE id = v_tx.wallet_id;
    END IF;
    IF v_tx.to_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + v_tx.amount, is_archived = false WHERE id = v_tx.to_wallet_id;
    END IF;
  END IF;

  -- กู้คืน (ล้างค่า deleted_at)
  UPDATE public.transactions SET deleted_at = NULL WHERE id = p_tx_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
