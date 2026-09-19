-- ==========================================
-- 🗑️ ระบบถังขยะ (Soft Delete) และกู้คืนรายการ
-- ==========================================

-- 1. เพิ่มคอลัมน์ deleted_at ใน transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. ฟังก์ชันย้ายลงถังขยะ พร้อมคืนยอดเงิน
CREATE OR REPLACE FUNCTION move_to_trash(p_tx_id UUID, p_user_id UUID) RETURNS BOOLEAN AS $body
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- ทำความสะอาดถังขยะ: ลบข้อมูลทิ้งถาวรหากลบเกิน 3 วัน (Lazy Cleanup Pattern)
  DELETE FROM transactions WHERE user_id = p_user_id AND deleted_at < NOW() - INTERVAL '3 days';

  -- ดึงข้อมูลรายการที่ต้องการลบ
  SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id AND user_id = p_user_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- คืนเงินเข้ากระเป๋า
  IF v_tx.type = 'expense' THEN
    UPDATE buckets SET balance = balance + v_tx.amount WHERE id = v_tx.bucket_id;
  ELSIF v_tx.type = 'income' THEN
    -- คืนยอดจากทุกกระเป๋าที่ถูกแบ่งเงินไป
    FOR v_alloc IN SELECT bucket_id, amount FROM allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE buckets SET balance = balance - v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
  END IF;

  -- ย้ายลงถังขยะ
  UPDATE transactions SET deleted_at = NOW() WHERE id = p_tx_id;
  RETURN TRUE;
END;
$body LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ฟังก์ชันกู้คืนรายการจากถังขยะ พร้อมหักเงินใหม่
CREATE OR REPLACE FUNCTION restore_from_trash(p_tx_id UUID, p_user_id UUID) RETURNS BOOLEAN AS $body
DECLARE
  v_tx RECORD;
  v_alloc RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- ทำความสะอาดถังขยะเช่นกัน
  DELETE FROM transactions WHERE user_id = p_user_id AND deleted_at < NOW() - INTERVAL '3 days';

  SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id AND user_id = p_user_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- หัก/เพิ่มเงินกลับตามประเภทรายการ
  IF v_tx.type = 'expense' THEN
    UPDATE buckets SET balance = balance - v_tx.amount WHERE id = v_tx.bucket_id;
  ELSIF v_tx.type = 'income' THEN
    FOR v_alloc IN SELECT bucket_id, amount FROM allocations WHERE income_transaction_id = p_tx_id LOOP
      UPDATE buckets SET balance = balance + v_alloc.amount WHERE id = v_alloc.bucket_id;
    END LOOP;
  END IF;

  -- กู้คืน (ล้างค่า deleted_at)
  UPDATE transactions SET deleted_at = NULL WHERE id = p_tx_id;
  RETURN TRUE;
END;
$body LANGUAGE plpgsql SECURITY DEFINER;
