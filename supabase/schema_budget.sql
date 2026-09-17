-- ==========================================
-- 🎯 ระบบงบประมาณรายเดือน (Monthly Budget Limits)
-- ==========================================

-- 1. เพิ่มคอลัมน์ monthly_budget ในตาราง buckets
ALTER TABLE buckets ADD COLUMN IF NOT EXISTS monthly_budget NUMERIC(15,2) DEFAULT NULL;

-- 2. คอมเมนต์อธิบายฟิลด์
COMMENT ON COLUMN buckets.monthly_budget IS 'เพดานงบประมาณรายจ่ายประจำเดือน (บาท) หากเป็น NULL แปลว่าไม่จำกัดงบ';
