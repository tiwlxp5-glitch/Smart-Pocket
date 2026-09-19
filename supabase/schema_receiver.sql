-- ==========================================
-- 👤 เพิ่มช่อง "ชื่อผู้รับเงิน (Receiver)"
-- ==========================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver TEXT;

-- อัพเดทฟังก์ชันตอนจ่ายเงินให้เก็บชื่อผู้รับด้วย
CREATE OR REPLACE FUNCTION process_expense(
  p_user_id UUID, p_bucket_id UUID, p_amount NUMERIC, p_category TEXT, p_note TEXT, p_date TIMESTAMP WITH TIME ZONE, p_slip_url TEXT DEFAULT NULL, p_receiver TEXT DEFAULT NULL
) RETURNS UUID AS $body
DECLARE
  v_transaction_id UUID; v_current_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT balance INTO v_current_balance FROM buckets WHERE id = p_bucket_id AND user_id = p_user_id FOR UPDATE;
  IF v_current_balance IS NULL THEN RAISE EXCEPTION 'Bucket not found'; END IF;
  
  INSERT INTO transactions (user_id, bucket_id, type, amount, category, note, transaction_date, slip_url, receiver)
  VALUES (p_user_id, p_bucket_id, 'expense', p_amount, p_category, p_note, p_date, p_slip_url, p_receiver)
  RETURNING id INTO v_transaction_id;

  UPDATE buckets SET balance = balance - p_amount WHERE id = p_bucket_id;
  RETURN v_transaction_id;
END;
$body LANGUAGE plpgsql SECURITY DEFINER;
