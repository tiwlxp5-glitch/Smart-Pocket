-- ==========================================
-- 🌟 Smart Pocket - Database Schema & RLS
-- ==========================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Buckets Table (กระเป๋าเงินย่อย)
CREATE TABLE IF NOT EXISTS buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  allocation_percentage NUMERIC(5,2) DEFAULT 0, -- แผนการแบ่งเงิน %
  target_amount NUMERIC(15,2), -- เป้าหมาย (ถ้ามี)
  balance NUMERIC(15,2) DEFAULT 0 NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own buckets" ON buckets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own buckets" ON buckets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own buckets" ON buckets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own buckets" ON buckets FOR DELETE USING (auth.uid() = user_id);

-- 3. Transactions Table (รายรับ/รายจ่าย)
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  bucket_id UUID REFERENCES buckets(id), -- อาจจะเป็น null กรณี income ที่ยังไม่ได้จัดสรร
  type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  category TEXT,
  note TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- 4. Allocations Table (ประวัติการแยกเงินจากรายรับสู่กระเป๋าต่างๆ)
CREATE TABLE IF NOT EXISTS allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  income_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  bucket_id UUID REFERENCES buckets(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own allocations" ON allocations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own allocations" ON allocations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 🛠️ Database Functions & Triggers
-- ==========================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_buckets_updated_at BEFORE UPDATE ON buckets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 🚀 AUTOMATION: Create Profile & Default Buckets on Signup
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  -- 2. Auto-create 3 Default Buckets (เงินสำรองฉุกเฉิน, เงินลงทุน, ค่ากิน/ใช้ชีวิต)
  INSERT INTO public.buckets (user_id, name, icon, color, allocation_percentage)
  VALUES 
    (new.id, 'เงินสำรองฉุกเฉิน', 'shield', '#F59E0B', 20), -- Amber
    (new.id, 'เงินลงทุน', 'trending-up', '#10B981', 30), -- Emerald
    (new.id, 'เงินใช้ชีวิตประจำวัน', 'coffee', '#3B82F6', 50); -- Blue

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 💰 ATOMIC RPC: Process Expense & Deduct Bucket
-- ==========================================
CREATE OR REPLACE FUNCTION process_expense(
  p_user_id UUID,
  p_bucket_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_note TEXT,
  p_date TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance NUMERIC;
BEGIN
  -- 1. Check Bucket Ownership and Balance (Optional: Allow negative balance or strictly block it)
  SELECT balance INTO v_current_balance FROM buckets WHERE id = p_bucket_id AND user_id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Bucket not found or permission denied';
  END IF;

  -- 2. Insert Transaction
  INSERT INTO transactions (user_id, bucket_id, type, amount, category, note, transaction_date)
  VALUES (p_user_id, p_bucket_id, 'expense', p_amount, p_category, p_note, p_date)
  RETURNING id INTO v_transaction_id;

  -- 3. Update Bucket Balance
  UPDATE buckets SET balance = balance - p_amount WHERE id = p_bucket_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
