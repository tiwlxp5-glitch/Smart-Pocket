# รายงานการสำรวจระบบทดสอบ โครงสร้างฐานข้อมูล และแผนการทดสอบ Milestone 5
**หัวข้อ**: ระบบรายการประจำอัตโนมัติ (Recurring Transactions) สำหรับ Smart Pocket  
**Agent ผู้สำรวจ**: `explorer_test_survey`  
**วันและเวลาที่สำรวจ**: 2026-09-17T21:50:00+07:00  
**ไฟล์อ้างอิงความต้องการหลัก**: [ORIGINAL_REQUEST.md](file:///c:/แอพรายรับรายจ่าย/ORIGINAL_REQUEST.md)

---

## 1. บทสรุปผู้บริหาร (Executive Summary)

การสำรวจนี้มุ่งเน้นการวิเคราะห์โครงสร้างระบบทดสอบเดิม (`tests/`), การตั้งค่าการรันสคริปต์ใน `package.json`, สภาพแวดล้อม Node.js runtime, สคีมาฐานข้อมูล Supabase (`supabase/`), ตลอดจนการออกแบบแผนการทดสอบแบบ 4-Tier Coverage สำหรับระบบรายการประจำอัตโนมัติ (Recurring Transactions) ใน Milestone 5

### สรุปผลการค้นพบสำคัญ:
1. **ระบบรันการทดสอบ (Test Runner)**: โปรเจกต์ใช้ Node.js Built-in Test Runner (`node:test` และ `node:assert/strict`) ทำงานร่วมกับ ES Modules (`tests/*.test.mjs`) โดยรันผ่านคำสั่ง `npm test` รวดเร็วมาก (< 1.1 วินาที) และเป็น Zero-Dependency ตาม Production Rule 3
2. **สภาพแวดล้อม Node.js & TypeScript**: ระบบรันบน **Node.js v24.18.0** ซึ่งรองรับการ Parse ไฟล์ `.ts` ได้ในตัว อย่างไรก็ตาม การรัน `node --test` โดยตรงไม่ผ่าน Next.js/Turbopack resolver ดังนั้นการนำเข้าฟังก์ชันในชุดทดสอบควรใช้ Relative Path (`../src/utils/recurringHelper.ts`) หรือนิยาม/ส่งออกฟังก์ชันแบบ Pure ES Module เพื่อป้องกันปัญหา Path Alias (`@/...`) ใน Node runner
3. **โครงสร้างฐานข้อมูล (Supabase SQL)**: สคีมาเดิมแยกตามฟังก์ชันชัดเจนในโฟลเดอร์ `supabase/` ตารางใหม่ `recurring_schedules` และ Atomic PostgreSQL RPC `process_due_recurring_transactions` ใน `supabase/schema_recurring.sql` ต้องรองรับ:
   - รายการประเภท `expense`: หักยอดกระเป๋าเงิน (ยอมให้ยอดติดลบได้ตามกติกา) และบันทึกลง `transactions`
   - รายการประเภท `income`: กระจายเงินตามสัดส่วน `%` ของแต่ละกระเป๋า และบันทึกลง `transactions` + `allocations`
   - การขยับ `next_run_date` ไปยังรอบถัดไปอัตโนมัติพร้อมรองรับการปิดใช้งานเมื่อเลย `end_date`
4. **ความซับซ้อนของการคำนวณวัน (Scheduling Edge Cases)**: ฟังก์ชัน `calculateNextRunDate` มีจุดวิกฤตทางการเงินที่ต้องทดสอบอย่างเข้มขวด โดยเฉพาะกรณี **สิ้นเดือน (Month-end Clamping)** เช่น 31 ม.ค. -> 28 ก.พ. (หรือ 29 ก.พ. ในปีอธิกสุรทิน) และการ **คงค่าวันเดิม (Anchor Day Preservation)** เมื่อข้ามจาก 28 ก.พ. ไป มี.ค. ต้องคืนค่าเป็นวันที่ 31 ไม่ใช่ค้างอยู่ที่ 28

---

## 2. การสำรวจ Test Runner & Infrastructure

### 2.1 ข้อมูลสภาพแวดล้อมและ Script ใน `package.json`
- **Node Version**: `v24.18.0` (ตรวจสอบผ่าน `node -v`)
- **Package Manager**: npm
- **คำสั่ง Test**:
  ```json
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
  ```
- **Dependencies ที่เกี่ยวข้องกับวันที่และการคำนวณ**:
  - `date-fns`: `^4.4.0` (ติดตั้งแล้วใน `node_modules`, สามารถเรียกใช้ในโค้ดและชุดทดสอบได้)
  - `exceljs`: `^4.4.0` (ทดสอบแล้วใน Milestone 4)

### 2.2 โครงสร้างและแนวทางการเขียนชุดทดสอบเดิม (`tests/milestone4.test.mjs`)
จากการวิเคราะห์ไฟล์ [tests/milestone4.test.mjs](file:///c:/แอพรายรับรายจ่าย/tests/milestone4.test.mjs):
- **Runner**: `import { test, describe } from 'node:test'`
- **Assertions**: `import assert from 'node:assert/strict'`
- **รูปแบบการทดสอบ**:
  - แยกเป็นกลุ่มตามฟังก์ชันย่อยด้วย `describe(...)`
  - ใช้ `test('คำอธิบายพฤติกรรม', () => { ... })`
  - เน้นการทดสอบแบบ **Pure Unit & Contract Testing** ที่ไม่พึ่งพา External Network / Live Database ทำให้การรันทำได้รวดเร็วระดับ Millisecond และเชื่อถือได้ 100%
  - ครอบคลุมทั้งกรณีปกติ (Happy Path), กรณีขอบเขต (Boundary Values), และกรณีข้อมูลผิดปกติ (Invalid Inputs)
- **สถานะการรันปัจจุบัน**:
  - รันคำสั่ง `npm test` ผลลัพธ์: ผ่านครบ 10/10 tests, 0 failures, ใช้เวลา ~1.08 วินาที
  - รันคำสั่ง `npm run build` ผลลัพธ์: Next.js 16.3.5 Turbopack Build ผ่านฉลุย 0 errors

### 2.3 ข้อสังเกตสำคัญด้าน Module Resolution ใน Node 24
- เมื่อรัน `node --test tests/*.test.mjs`:
  - Node 24 สามารถ import ไฟล์ `.ts` ได้โดยตรงผ่าน ES Module syntax
  - **ข้อควรระวัง (Critical Note)**: Path alias `@/...` (เช่น `@/utils/...`) เป็นคอนฟิกของ Next.js และ TypeScript (`tsconfig.json`) ซึ่ง Node.js ESM resolver ทั่วไปไม่รู้จัก หากไฟล์ทดสอบเรียก import ที่มี `@/...` จะเกิดข้อผิดพลาด `ERR_MODULE_NOT_FOUND`
  - **แนวทางปฏิบัติ (Best Practice)**:
    1. ในไฟล์ `src/utils/recurringHelper.ts` ให้เขียนแบบ Pure TypeScript/ESM โดย import ภายนอกจาก `date-fns` หรือ standard JS library
    2. ในไฟล์ `tests/milestone5_recurring.test.mjs` ให้นำเข้าโดยใช้ Relative Path เช่น:
       `import { calculateNextRunDate, ... } from '../src/utils/recurringHelper.ts'` หรือทดสอบ contract ผ่าน pure functions ที่สอดคล้องกับ implementation

---

## 3. การสำรวจสคีมาฐานข้อมูล Supabase (`supabase/`)

### 3.1 สคีมาเดิมที่มีอยู่
1. [supabase/schema.sql](file:///c:/แอพรายรับรายจ่าย/supabase/schema.sql):
   - ตาราง `profiles` (id UUID PRIMARY KEY, full_name, avatar_url)
   - ตาราง `buckets` (id UUID PRIMARY KEY, user_id, name, allocation_percentage, balance, monthly_budget, is_archived)
   - ตาราง `transactions` (id UUID PRIMARY KEY, user_id, bucket_id, type transaction_type ENUM, amount, category, note, transaction_date)
   - ตาราง `allocations` (id UUID PRIMARY KEY, user_id, income_transaction_id, bucket_id, amount)
   - RPC `process_expense(p_user_id, p_bucket_id, p_amount, p_category, p_note, p_date, p_slip_url, p_receiver)`
   - Trigger `handle_new_user` สร้างโปรไฟล์และ 3 กระเป๋าเงินเริ่มต้น (เงินสำรองฉุกเฉิน 20%, เงินลงทุน 30%, เงินใช้ชีวิตประจำวัน 50%)
2. [supabase/schema_trash.sql](file:///c:/แอพรายรับรายจ่าย/supabase/schema_trash.sql):
   - Soft-delete column `deleted_at`
   - RPC `move_to_trash(p_tx_id, p_user_id)` และ `restore_from_trash(p_tx_id, p_user_id)`
3. [supabase/schema_budget.sql](file:///c:/แอพรายรับรายจ่าย/supabase/schema_budget.sql):
   - คอลัมน์ `monthly_budget NUMERIC(15,2)` ใน `buckets`

### 3.2 สคีมาใหม่ที่ต้องจัดเตรียม: `supabase/schema_recurring.sql`
ตามข้อกำหนด R1 ต้องสร้าง:
1. **ตาราง `recurring_schedules`**:
   ```sql
   CREATE TABLE IF NOT EXISTS recurring_schedules (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
     type transaction_type NOT NULL, -- 'income' หรือ 'expense'
     bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL, -- สำหรับ expense (income เป็น NULL ได้)
     amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
     category TEXT,
     note TEXT,
     frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
     day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
     day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
     start_date DATE NOT NULL DEFAULT CURRENT_DATE,
     end_date DATE,
     next_run_date DATE NOT NULL,
     last_run_date DATE,
     is_active BOOLEAN NOT NULL DEFAULT true,
     auto_process BOOLEAN NOT NULL DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```
2. **Row Level Security (RLS)**:
   - `SELECT`, `INSERT`, `UPDATE`, `DELETE` โดยตรวจสอบ `auth.uid() = user_id`
3. **Atomic RPC `process_due_recurring_transactions(p_user_id UUID)`**:
   - ค้นหารายการที่ `user_id = p_user_id AND is_active = true AND next_run_date <= CURRENT_DATE AND (end_date IS NULL OR next_run_date <= end_date)`
   - ล็อกแถวด้วย `FOR UPDATE` ป้องกัน Race Condition
   - สำหรับ `expense`:
     - สร้างแถวใน `transactions` (type = 'expense')
     - อัปเดต `buckets.balance = buckets.balance - amount` (อนุญาตให้ balance ติดลบได้)
   - สำหรับ `income`:
     - สร้างแถวใน `transactions` (type = 'income')
     - ค้นหา `buckets` ของผู้ใช้ คำนวณยอดจัดสรรตาม `allocation_percentage`
     - สร้างแถวใน `allocations` และบวกยอดเข้า `buckets.balance`
   - คำนวณ `next_run_date` รอบถัดไป:
     - หากรอบถัดไปเกิน `end_date` ให้ปรับ `is_active = false`
     - บันทึก `last_run_date = CURRENT_DATE`
   - คืนค่าผลลัพธ์เป็น JSON สรุปจำนวนรายการที่ประมวลผลสำเร็จ

---

## 4. การวิเคราะห์ตรรกะวันที่และ Edge Cases ของ `calculateNextRunDate`

ฟังก์ชันหลักใน `src/utils/recurringHelper.ts`:
`calculateNextRunDate(currentDate: Date | string, frequency: string, dayOfMonth?: number | null, dayOfWeek?: number | null): string`

### 4.1 ตารางวิเคราะห์พฤติกรรมแต่ละความถี่และกรณีขอบเขต

| ความถี่ | เงื่อนไข / อินพุต | วันที่อ้างอิง | ผลลัพธ์ที่คาดหวัง | เหตุผล & ตรรกะทางธุรกิจ |
|---|---|---|---|---|
| **Daily** | ปกติ | 2026-09-17 | 2026-09-18 | บวก 1 วัน |
| **Daily** | สิ้นเดือน 30 วัน | 2026-09-30 | 2026-10-01 | ข้ามสู่เดือนถัดไปถูกต้อง |
| **Daily** | สิ้นเดือน 31 วัน | 2026-08-31 | 2026-09-01 | ข้ามสู่เดือนถัดไปถูกต้อง |
| **Daily** | ปีอธิกสุรทิน (Leap Year) | 2024-02-28 | 2024-02-29 | กุมภาพันธ์มี 29 วัน |
| **Daily** | สิ้นสุดกุมภาพันธ์ Leap Year | 2024-02-29 | 2024-03-01 | ข้ามเข้าสู่มีนาคม |
| **Daily** | สิ้นปี | 2026-12-31 | 2027-01-01 | ข้ามสู่ปีถัดไป |
| **Weekly** | บวก 7 วันทั่วไป | 2026-09-17 (พฤหัส) | 2026-09-24 (พฤหัส) | บวก 7 วัน |
| **Weekly** | กำหนดวันในสัปดาห์ (จันทร์ = 1) | 2026-09-17 (พฤหัส) | 2026-09-21 (จันทร์) | ข้ามไปยังวันจันทร์ถัดไป |
| **Weekly** | วันนี้ตรงกับวันที่กำหนดพอดี | 2026-09-21 (จันทร์, dayOfWeek=1) | 2026-09-28 (จันทร์) | ขยับไปสัปดาห์หน้า (+7 วัน) ป้องกันการรันซ้ำ |
| **Weekly** | สิ้นเดือนข้ามเดือน | 2026-09-28 (จันทร์) | 2026-10-05 (จันทร์) | คำนวณวันข้ามเดือนไม่ตกหล่น |
| **Monthly** | วันกลางเดือนทั่วไป | 2026-01-15, day=15 | 2026-02-15 | เดือนถัดไป วันที่ 15 |
| **Monthly (CRITICAL)** | สิ้นเดือน 31 -> ก.พ. ปกติ (28 วัน) | 2026-01-31, day=31 | **2026-02-28** | ก.พ. ปี 2026 มี 28 วัน ต้อง Clamp ไม่ให้ล้นไป 3 มี.ค. |
| **Monthly (CRITICAL)** | สิ้นเดือน 31 -> ก.พ. Leap Year (29 วัน) | 2024-01-31, day=31 | **2024-02-29** | ก.พ. ปี 2024 มี 29 วัน ต้องได้ 29 ก.พ. |
| **Monthly (ANCHOR)** | หลังโดน Clamp ก.พ. -> มี.ค. | 2026-02-28, day=31 | **2026-03-31** | **ต้องคืนค่าเป็น 31 มี.ค.** ตาม `dayOfMonth=31` ห้ามค้างเป็น 28 |
| **Monthly** | 31 ม.ค. -> เม.ย. (30 วัน) | 2026-03-31, day=31 | **2026-04-30** | เมษายนมี 30 วัน ต้อง Clamp เป็นวันที่ 30 |
| **Monthly (ANCHOR)** | 30 เม.ย. -> พ.ค. (31 วัน) | 2026-04-30, day=31 | **2026-05-31** | คืนค่าเป็นวันที่ 31 พ.ค. |
| **Monthly** | สิ้นปี 31 ธ.ค. -> ม.ค. ปีหน้า | 2026-12-31, day=31 | **2027-01-31** | ข้ามปี คืนค่า 31 ม.ค. 2027 |
| **Yearly** | รายปีปกติ | 2026-09-17 | 2027-09-17 | บวก 1 ปี |
| **Yearly (CRITICAL)** | 29 ก.พ. จาก Leap Year สู่ปีปกติ | 2024-02-29 | **2025-02-28** | ปี 2025 ไม่มี 29 ก.พ. ต้องปรับเป็น 28 ก.พ. |
| **Yearly** | สิ้นปีรายปี | 2026-12-31 | 2027-12-31 | วันที่เดิมในปีถัดไป |

### 4.2 ตรรกะทางคณิตศาสตร์ในการคำนวณวันสิ้นเดือนแบบคงที่ (Anchor Clamping Algorithm)
```typescript
// Pseudocode for Monthly Calculation
function getNextMonthlyDate(currentDate: Date, targetDayOfMonth: number): Date {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  
  // คำนวณปีและเดือนเป้าหมาย
  let targetYear = currentYear;
  let targetMonth = currentMonth + 1;
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  
  // หาจำนวนวันทั้งหมดของเดือนเป้าหมาย (วันที่ 0 ของเดือนถัดไปคือวันสุดท้ายของเดือนนี้)
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  // ใช้ค่าน้อยสุดระหว่าง targetDayOfMonth และจำนวนวันจริงในเดือนนั้น
  const clampedDay = Math.min(targetDayOfMonth, daysInTargetMonth);
  
  return new Date(targetYear, targetMonth, clampedDay);
}
```

---

## 5. แผนการออกแบบชุดทดสอบ 4-Tier Test Suite (`tests/milestone5_recurring.test.mjs`)

เพื่อให้สอดคล้องกับ Production Baseline Rule 5 (Automated Test for critical logic) และ Acceptance Criteria ใน ORIGINAL_REQUEST.md ชุดทดสอบจะแบ่งออกเป็น 4 Tiers ดังนี้:

### 🔹 Tier 1: Pure Mathematical & Date Scheduling Logic (Unit Tests)
- **1.1 Daily Frequency Scheduling**:
  - บวกวันปกติ (17 ก.ย. -> 18 ก.ย.)
  - ข้ามเดือนที่มี 30 วัน (30 ก.ย. -> 1 ต.ค.)
  - ข้ามเดือนที่มี 31 วัน (31 ส.ค. -> 1 ก.ย.)
  - ข้ามเดือนกุมภาพันธ์ปีอธิกสุรทิน (28 ก.พ. 2024 -> 29 ก.พ. 2024 -> 1 มี.ค. 2024)
  - ข้ามปี (31 ธ.ค. 2026 -> 1 ม.ค. 2027)
- **1.2 Weekly Frequency Scheduling**:
  - บวก 7 วันเมื่อไม่ระบุ dayOfWeek
  - กระโดดไปยังวันที่ระบุในสัปดาห์ (เช่น พฤหัสบดี -> จันทร์ถัดไป)
  - กรณีตรงกับวันเป้าหมายพอดี ต้องเลื่อนไปสัปดาห์หน้า (+7 วัน) ป้องกันการรันซ้ำ
  - ข้ามเดือนในรอบสัปดาห์ (28 ก.ย. -> 5 ต.ค.)
- **1.3 Monthly Frequency & Month-End Clamping**:
  - 31 ม.ค. 2026 -> 28 ก.พ. 2026 (ปีปกติ 28 วัน)
  - 31 ม.ค. 2024 -> 29 ก.พ. 2024 (ปี Leap Year 29 วัน)
  - **Anchor Recovery**: 28 ก.พ. 2026 (ที่มี `dayOfMonth=31`) -> 31 มี.ค. 2026 (คืนค่า 31 วัน)
  - 31 มี.ค. 2026 -> 30 เม.ย. 2026 (Clamp 30 วัน)
  - 30 เม.ย. 2026 -> 31 พ.ค. 2026 (คืนค่า 31 วัน)
  - สิ้นปี: 31 ธ.ค. 2026 -> 31 ม.ค. 2027
  - วันกลางเดือนปกติ (วันที่ 1, 15, 20)
- **1.4 Yearly Frequency & Leap Year Transitions**:
  - 17 ก.ย. 2026 -> 17 ก.ย. 2027
  - 29 ก.พ. 2024 -> 28 ก.พ. 2025 (Clamp ปีปกติ)
  - 31 ธ.ค. 2026 -> 31 ธ.ค. 2027
- **1.5 Thai Frequency Label Formatting**:
  - `formatRecurringFrequency('daily')` -> `'ทุกวัน'`
  - `formatRecurringFrequency('weekly', null, 1)` -> `'ทุกวันจันทร์'`
  - `formatRecurringFrequency('monthly', 25)` -> `'ทุกวันที่ 25 ของเดือน'`
  - `formatRecurringFrequency('yearly', null, null, '09-17')` -> `'ทุกปี วันที่ 17 ก.ย.'`
- **1.6 Monthly Commitments Math (ภาระค่าใช้จ่ายประจำต่อเดือน)**:
  - Daily 100 บาท -> 3,000 บาท/เดือน (100 * 30)
  - Weekly 500 บาท -> 2,000 บาท/เดือน (500 * 4) หรือ 2,166.67 บาท
  - Monthly 1,500 บาท -> 1,500 บาท/เดือน
  - Yearly 12,000 บาท -> 1,000 บาท/เดือน (12,000 / 12)
  - รวมภาระค่าใช้จ่ายสุทธิถูกต้อง

### 🔹 Tier 2: Validation Rules, Input Sanitization & Boundary Constraints
- **2.1 Amount Validation**:
  - ค่าจำนวนเงินต้องเป็นบวกเท่านั้น (`amount > 0`)
  - ปฏิเสธค่า 0, ค่าติดลบ, NaN, Infinity
- **2.2 Frequency Enum Validation**:
  - ต้องเป็นหนึ่งใน `['daily', 'weekly', 'monthly', 'yearly']` เท่านั้น
- **2.3 Day Bounds Validation**:
  - `day_of_month` ต้องอยู่ระหว่าง `1` ถึง `31`
  - `day_of_week` ต้องอยู่ระหว่าง `0` ถึง `6`
- **2.4 Date Range Validation**:
  - `start_date` ต้องเป็นวันที่ที่ถูกต้อง
  - หากมี `end_date` ต้องไม่น้อยกว่า `start_date` (`end_date >= start_date`)
- **2.5 String Length Protection**:
  - ป้องกันข้อความ note ยาวเกิน 200 ตัวอักษร
  - ป้องกันชื่อ category ยาวเกิน 50 ตัวอักษร

### 🔹 Tier 3: RPC Contract Simulation & State Transitions (Data Layer Testing)
- **3.1 Expense Recurring Processing**:
  - จำลองการหักยอดเงินจาก Bucket: ยอดเงินลดลงตรงตามจำนวน
  - ทดสอบกรณีเงินใน Bucket ไม่พอ: **ต้องยอมให้ยอดเงินติดลบได้** (Negative balance allowed) ตามข้อกำหนด R1
  - บันทึกลงตาราง `transactions` พร้อม timestamp และ category
- **3.2 Income Recurring & Allocation Distribution**:
  - จำลองการกระจายเงินตาม % Allocation ของแต่ละ Bucket (20%, 30%, 50%)
  - ผลรวมยอดกระจายต้องเท่ากับยอดรายรับทั้งหมด ไม่มีการสูญหายของเศษทศนิยม
  - บันทึกประวัติลง `allocations` ถูกต้องทุกรายการ
- **3.3 Lazy Evaluation Runner Idempotency**:
  - การรัน Lazy Runner ซ้ำสองครั้งในวันเดียวกัน ต้องไม่สร้างรายการซ้ำ (เพราะ `next_run_date` ถูกเลื่อนไปข้างหน้าแล้ว)
- **3.4 Auto-Expiry Handling**:
  - เมื่อ `next_run_date` คำนวณแล้วเกินกว่า `end_date` สถานะ `is_active` ต้องถูกปรับเป็น `false` ทันที
- **3.5 Paused / Inactive Bypass**:
  - รายการที่ `is_active = false` ต้องถูกข้าม ไม่ถูกนำมาประมวลผล

### 🔹 Tier 4: UI Presentation, Badges & Thai Notifications
- **4.1 Status Badge Resolver**:
  - `is_active = false` -> แสดงสถานะ "ปิดใช้งาน" (Inactive / Paused)
  - `next_run_date > end_date` -> แสดงสถานะ "หมดอายุ" (Expired)
  - `next_run_date <= TODAY` -> แสดงสถานะ "ถึงกำหนดวันนี้" (Due Today)
  - `next_run_date > TODAY` -> แสดงสถานะ "ปกติ / กำหนดรอบถัดไป" (Scheduled)
- **4.2 Net Recurring Flow**:
  - คำนวณ `Net Monthly Flow = Total Recurring Income - Total Recurring Expense`
- **4.3 Lazy Runner Notification Banner Format**:
  - จัดรูปแบบข้อความแจ้งเตือนภาษาไทยเมื่อประมวลผลสำเร็จ เช่น `"บันทึกรายการประจำอัตโนมัติเรียบร้อย 2 รายการ"`

---

## 6. คำแนะนำสำหรับทีม Implementer (Actionable Recommendations)

1. **การสร้าง Utility `src/utils/recurringHelper.ts`**:
   - ให้สร้างฟังก์ชัน Pure Functions เป็นหลัก: `calculateNextRunDate`, `formatRecurringFrequency`, `calculateMonthlyCommitment`, `validateRecurringInput`
   - ไม่นำเข้าโมดูล Next.js หรือ server-only dependencies ในไฟล์นี้ เพื่อให้ Node.js test runner สามารถ import ไปทดสอบได้อย่างอิสระ
   - ส่งออก Type Definition อย่างชัดเจน เช่น `RecurringFrequency`, `RecurringScheduleInput`, `RecurringStatus`
2. **การเขียนชุดทดสอบ `tests/milestone5_recurring.test.mjs`**:
   - ใช้ `node:test` และ `node:assert/strict`
   - นำเข้าจาก `../src/utils/recurringHelper.ts`
   - ออกแบบชุดทดสอบให้มีมากกว่า 20+ test cases ครอบคลุมทั้ง 4 Tiers เพื่อความสมบูรณ์แบบระดับ Senior Staff Engineer
3. **การสร้างไฟล์ SQL `supabase/schema_recurring.sql`**:
   - เขียนฟังก์ชัน RPC `process_due_recurring_transactions` ให้เป็น `SECURITY DEFINER`
   - ใช้วงรอบ `FOR UPDATE` ใน PostgreSQL เพื่อป้องกัน Concurrency Race Condition เมื่อผู้ใช้เปิดหลาย Tab พร้อมกัน
   - จัดการ Month-end Clamping ใน PostgreSQL ให้ตรงกับ TypeScript helper
4. **การรันคำสั่งตรวจสอบความสมบูรณ์ (End-of-Task Protocol)**:
   - ตรวจสอบการรันคำสั่ง `npm test` ให้ผ่านทั้ง `milestone4.test.mjs` และ `milestone5_recurring.test.mjs`
   - ตรวจสอบ `npm run build` ให้คอมไพล์ผ่าน 0 errors ก่อนส่งงาน UAT
