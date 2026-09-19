-- อัพเดทตาราง transactions เพื่อรองรับการเก็บ URL ของสลิป
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS slip_url TEXT;

-- อัพเดท RPC function process_expense ให้รองรับ slip_url
CREATE OR REPLACE FUNCTION process_expense(
  p_user_id UUID,
  p_bucket_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_note TEXT,
  p_date TIMESTAMP WITH TIME ZONE,
  p_slip_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  -- 1. Check Bucket
  SELECT balance INTO v_current_balance FROM buckets WHERE id = p_bucket_id AND user_id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Bucket not found or permission denied';
  END IF;

  -- 2. Insert Transaction with slip_url
  INSERT INTO transactions (user_id, bucket_id, type, amount, category, note, transaction_date, slip_url)
  VALUES (p_user_id, p_bucket_id, 'expense', p_amount, p_category, p_note, p_date, p_slip_url)
  RETURNING id INTO v_transaction_id;

  -- 3. Update Bucket Balance
  UPDATE buckets SET balance = balance - p_amount WHERE id = p_bucket_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 🗂️ สร้างพื้นที่เก็บไฟล์ (Storage Bucket) สำหรับสลิป
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('slips', 'slips', true) ON CONFLICT (id) DO NOTHING;

-- ตั้งค่าความปลอดภัยให้คนล็อกอินอัพโหลดได้ และทุกคนอ่านได้
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'slips');
CREATE POLICY "Auth Users Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'slips' AND auth.role() = 'authenticated');
