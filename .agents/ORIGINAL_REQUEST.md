# Original User Request

## 2026-09-17T14:43:38Z

Requested team: Full Team

ระบบรายการประจำอัตโนมัติ (Recurring Transactions) สำหรับ Smart Pocket เพื่อบันทึกรายรับ-รายจ่ายตามรอบบิลอัตโนมัติ (เช่น ค่าเช่าห้อง, ค่าเน็ต, Netflix, เงินเดือน) รองรับ 4 ความถี่ (Daily, Weekly, Monthly, Yearly) พร้อมระบบ Lazy Evaluation Runner เมื่อเปิดแอพ และ UI จัดการรายการประจำที่สมบูรณ์ระดับ Production

Working directory: c:\แอพรายรับรายจ่าย
Integrity mode: development

## Requirements

### R1. Database Schema & Supabase RPC
- สร้างตาราง recurring_schedules ในฐานข้อมูล Supabase พร้อมฟิลด์: id, user_id, type, bucket_id, amount, category, note, frequency, day_of_month, day_of_week, start_date, end_date, next_run_date, last_run_date, is_active, auto_process, created_at, updated_at.
- กำหนด Row Level Security (RLS) ครบถ้วน (SELECT, INSERT, UPDATE, DELETE โดย auth.uid() = user_id).
- สร้าง Atomic PostgreSQL RPC process_due_recurring_transactions(p_user_id UUID) ที่ประมวลผลบิลที่ถึงกำหนด (next_run_date <= CURRENT_DATE และ is_active = true):
  - สำหรับ expense: หักยอดจาก bucket (ยอมให้ยอดติดลบได้เพื่อความสมบูรณ์ของประวัติบัญชี) และบันทึกลง transactions
  - สำหรับ income: คำนวณกระจายตาม allocation % และบันทึกลง transactions + allocations
  - เลื่อน next_run_date ไปยังรอบถัดไปอัตโนมัติ
- บันทึก SQL script ไว้ที่ supabase/schema_recurring.sql.

### R2. Date & Scheduling Calculation Logic
- สร้าง src/utils/recurringHelper.ts คำนวณวันครบกำหนดรอบบิลถัดไป calculateNextRunDate(currentDate, frequency, dayOfMonth, dayOfWeek):
  - Daily: วันถัดไป (+1 วัน)
  - Weekly: วันเดิมในสัปดาห์ถัดไป (+7 วัน หรือตรงกับ dayOfWeek)
  - Monthly: วันที่กำหนดในเดือนถัดไป รองรับ Edge Case วันสิ้นเดือน (เช่น 28/29 ก.พ. หรือเดือนที่มี 30 วัน เมื่อตั้งตัดรอบวันที่ 31)
  - Yearly: วันที่เดียวกันในปีถัดไป
- ฟังก์ชันแปลงข้อความภาษาไทยแสดงรอบบิลสำหรับ UI.

### R3. Server Actions & Lazy Evaluation Runner
- เพิ่ม Server Actions ใน src/app/dashboard/actions.ts:
  - createRecurringSchedule(formData: FormData)
  - updateRecurringSchedule(id: string, formData: FormData)
  - deleteRecurringSchedule(id: string)
  - toggleRecurringActive(id: string, isActive: boolean)
  - checkAndProcessRecurringAction() เพื่อรัน lazy evaluation เมื่อโหลดหน้า Dashboard.

### R4. User Interface & Navigation
- สร้างหน้า /dashboard/recurring (src/app/dashboard/recurring/page.tsx):
  - การ์ดสรุปภาระค่าใช้จ่ายประจำต่อเดือน (Monthly Commitments)
  - รายการบิลประจำ พร้อมสวิตช์ toggle เปิด/ปิด และปุ่มแก้ไข/ลบ
  - Modal/Drawer ฟอร์มสร้าง/แก้ไข Recurring Schedule ครบถ้วนทุกฟิลด์
- เพิ่มการ์ดทางลัดบน Dashboard หน้าแรก (src/app/dashboard/page.tsx) พร้อมแสดงข้อความแจ้งเตือนเมื่อมีรายการถูกบันทึกอัตโนมัติ
- เพิ่มเมนูเชื่อมโยงไปยังหน้ารายการประจำในหน้า Settings (src/app/dashboard/settings/page.tsx).

## Acceptance Criteria

### Automated Tests & Quality Verification
- [ ] มีชุดการทดสอบ tests/milestone5_recurring.test.mjs ที่ครอบคลุมการคำนวณวันรอบบิลถัดไปครบทั้ง 4 ความถี่ และ Edge Case สิ้นเดือน ผ่านฉลุย 100%
- [ ] รันคำสั่ง npm test ผ่านทั้งหมด (รวมทั้ง Milestone 4 และ Milestone 5)
- [ ] คำสั่ง npm run build คอมไพล์ผ่านสมบูรณ์ 0 errors, 0 type errors
- [ ] ทุกฟังก์ชันปฏิบัติตามมาตรฐานความปลอดภัย RLS และ Production Baseline
