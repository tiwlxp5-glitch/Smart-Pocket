-- ==========================================
-- 🛠️ Fix Foreign Key Constraints for User Deletion
-- ==========================================
-- Problem: When deleting a user from Supabase Auth, PostgreSQL blocks it 
-- because the public tables reference auth.users(id) without ON DELETE CASCADE.

-- 1. Fix profiles table (references auth.users)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey,
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Fix buckets table (references profiles)
ALTER TABLE public.buckets
DROP CONSTRAINT IF EXISTS buckets_user_id_fkey,
ADD CONSTRAINT buckets_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Fix transactions table (references profiles)
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey,
ADD CONSTRAINT transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Fix allocations table (references profiles)
ALTER TABLE public.allocations
DROP CONSTRAINT IF EXISTS allocations_user_id_fkey,
ADD CONSTRAINT allocations_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
