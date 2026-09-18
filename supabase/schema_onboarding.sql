-- ================================================================
-- 🌟 Smart Pocket - Milestone 7: Onboarding System
-- ================================================================

-- 1. Add is_onboarded to profiles table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_onboarded') THEN
    ALTER TABLE public.profiles ADD COLUMN is_onboarded BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Update handle_new_user to ensure is_onboarded defaults to false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, avatar_url, is_onboarded)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', false);

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
