-- ==========================================
-- 🔄 Smart Pocket - Recurring Transactions Schema
-- File: supabase/schema_recurring.sql
-- ==========================================

-- 1. Create recurring_schedules table
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL, -- 'income' or 'expense'
  bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL, -- Required for expense, null for income
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'ทั่วไป',
  note TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  next_run_date DATE NOT NULL,
  last_run_date DATE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  auto_process BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add reference column to transactions for tracking source recurring schedule
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recurring_schedules_updated_at ON recurring_schedules;
CREATE TRIGGER update_recurring_schedules_updated_at 
  BEFORE UPDATE ON recurring_schedules 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for high performance querying during lazy evaluation
CREATE INDEX IF NOT EXISTS idx_recurring_due 
  ON recurring_schedules (user_id, next_run_date) 
  WHERE is_active = true AND auto_process = true;

-- 2. Row Level Security (RLS) Policies
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recurring schedules" ON recurring_schedules;
CREATE POLICY "Users can view own recurring schedules"
  ON recurring_schedules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recurring schedules" ON recurring_schedules;
CREATE POLICY "Users can insert own recurring schedules"
  ON recurring_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recurring schedules" ON recurring_schedules;
CREATE POLICY "Users can update own recurring schedules"
  ON recurring_schedules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recurring schedules" ON recurring_schedules;
CREATE POLICY "Users can delete own recurring schedules"
  ON recurring_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Atomic PostgreSQL RPC: process_due_recurring_transactions
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
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Permission denied: Cannot process schedules for another user';
  END IF;

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

-- ==========================================
-- 🔒 Security Hardening: Restrict RPC to authenticated users only
-- Prevents anonymous PostgREST calls to this function
-- ==========================================
REVOKE EXECUTE ON FUNCTION process_due_recurring_transactions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION process_due_recurring_transactions(UUID) TO authenticated, service_role;
