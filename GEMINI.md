# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 6 Completed - Multi-Wallet & Transfers System)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Configured Supabase Auth and Database with RLS.
- Soft-delete (Trash) system with 3-day lazy cleanup implemented.
- AI Slip Scanner implemented using Gemini 3.6 Flash (extracts Amount, Note, Receiver, and Sender Bank).
- App metadata and PWA settings updated for mobile installation ("รายรับรายจ่าย").
- **Interactive Analytics & Charts System (`/dashboard/analytics`)**:
  - Time filters: สัปดาห์นี้, เดือนนี้, เดือนที่แล้ว, ปีนี้, ทั้งหมด.
  - Cashflow Bar Chart & Expense Donut Chart.
  - Financial Health KPIs: Net Cash Flow, Savings Rate %, Top 5 Spends.
- **User Profile Settings (`/dashboard/settings`)**:
  - Profile display name update via Supabase Auth & profiles table.
  - Secure password update form.
  - Per-bucket Monthly Budget limit configuration.
- **Export Data to CSV/Excel (`/dashboard/history`)**:
  - Modal with timeframe filter (เดือนนี้, ปีนี้, ทั้งหมด).
  - RFC 4180 compliant with UTF-8 BOM (`\uFEFF`) for perfect Thai character rendering in Microsoft Excel.
- **Budget Limit Alerts (Dashboard & Expense Form)**:
  - Yellow warning (>= 80%) & Red alert (>= 100%) on Dashboard.
  - Dynamic real-time calculation and alert banner when choosing buckets in `/dashboard/expense`.
- **Recurring Transactions System (`/dashboard/recurring`)**:
  - ตาราง `recurring_schedules` พร้อม RLS ครบ 4 ทิศทาง และ Index สำหรับ Lazy Evaluation.
  - Atomic PostgreSQL RPC `process_due_recurring_transactions` ที่ปลอดภัย (IDOR guard, `FOR UPDATE` row lock, safety cap 36 iterations).
  - รองรับ 4 ความถี่: รายวัน (Daily), รายสัปดาห์ (Weekly), รายเดือน (Monthly), รายปี (Yearly).
  - End-of-month anchor preservation (31 Jan -> 28 Feb -> 31 Mar ไม่เลื่อนวัน).
  - Lazy Evaluation Runner ตรวจสอบและบันทึกรายการอัตโนมัติเมื่อเปิด Dashboard.
  - UI หน้า `/dashboard/recurring` พร้อม Monthly Commitments KPI, Filter tabs, Toggle Active, Modal Form.
- **Receipt Image Cloud Backup**:
  - อัปโหลดสลิปเป็น compressed JPEG Blob (max 1200px, quality 0.7) แทน original file ประหยัด Storage.
  - `SlipLightbox` component (`src/components/SlipLightbox.tsx`): Self-contained badge 📎 + Modal.
  - หน้า History แสดง badge "มีสลิป" บนรายการที่มีรูป — กดเพื่อเปิด Lightbox ดูในแอพได้ทันที.
- **Multi-Wallet & Transfers System — NEW**:
  - **Dual-Layer Architecture**: กระเป๋า/บัญชี (เงินอยู่ที่ไหน) ทำงานควบคู่กับ ถังงบประมาณ (เงินไว้ทำอะไร).
  - ตาราง `wallets` พร้อม RLS ครบ 4 ทิศทาง รองรับ 4 ประเภท (`cash`, `bank`, `ewallet`, `credit`) และธีมสี/Preset ธนาคารไทย.
  - Atomic PostgreSQL RPC `process_transfer` ปลอดภัยด้วย `FOR UPDATE` row lock พร้อมรองรับค่าธรรมเนียมโอน (Transfer fee).
  - หน้าจัดการกระเป๋าเงิน (`/dashboard/wallets`) พร้อมการ์ด Net Worth (Assets vs Debts), Modal เพิ่ม/แก้ไขกระเป๋า.
  - หน้าโอนเงินระหว่างบัญชี (`/dashboard/transfer`) พร้อม Live balance preview, ปุ่ม Swap, และปุ่มลัดจำนวนเงิน.
  - Horizontal Wallets Carousel และ Shortcut Cards บนหน้าแรก Dashboard.
  - AI Slip Scanner ตรวจจับธนาคารผู้โอน (Sender Bank) และเลือกกระเป๋าเงินให้อัตโนมัติ.
  - Income รองรับทั้งแบ่งสัดส่วน % อัตโนมัติ และระบุเข้าถังงบเดี่ยว (100%).
  - รองรับการ Rollback คืนยอดเงินในถังขยะ (Soft Delete) ของทุกกระเป๋าอย่างแม่นยำ.
- **Milestone 6.1 (Linked Wallets & Auto-Transfer)**:
  - เพิ่มระบบ `default_wallet_id` ให้ถังงบ (Buckets) เพื่อผูกบัญชีธนาคารเข้ากับถังงบแบบ 1:1.
  - หน้า Setting (`/dashboard/settings`): เพิ่ม Dropdown เลือกกระเป๋าเงินผูกกับถังงบ.
  - **Auto-Select**: เมื่อเลือกถังงบในหน้าบันทึกรายจ่าย (Expense) หรือรายรับแบบ Single (Income) ระบบจะเลือกกระเป๋าเงินที่ผูกไว้อัตโนมัติ.
  - **Auto-Transfer**: เมื่อบันทึกรายรับ (Income) และกระจายเงินลงถัง หากถังนั้นผูกกับกระเป๋าเงินอื่นที่ไม่ได้เป็นกระเป๋าหลักรับเงิน ระบบจะรัน `process_transfer` เพื่อโอนเงินเข้าบัญชีจริงอัตโนมัติ (Statement ตรงเป๊ะ).
- **Milestone 6.2 (Hybrid Wallet Deletion)**:
  - รองรับการลบกระเป๋าเงินแบบปลอดภัยด้วยตรรกะ **Hybrid Delete**:
    - หากกระเป๋าไม่เคยมีรายการ (0 transactions) -> ลบถาวร (Hard Delete) เพื่อลดขยะจากผู้ใช้กรอกผิด
    - หากกระเป๋ามีรายการแล้ว (> 0 transactions) -> จะซ่อนกระเป๋า (Soft Delete / Archive) เพื่อรักษาประวัติรายการเก่า แต่บังคับให้เคลียร์ยอดเงิน (Balance = 0) ก่อนซ่อน เพื่อไม่ให้ Net Worth ผิดเพี้ยน
  - ระบบจะป้องกันไม่ให้ลบ "กระเป๋าหลัก (Default Wallet)" เพื่อป้องกันการทำงานผิดพลาดของระบบ
  - **Auto-Unlink Buckets**: เมื่อลบกระเป๋าแล้ว ระบบจะปลดกระเป๋าออกจากการผูกกับถังงบ (Linked Wallets) ให้อัตโนมัติ
- **Milestone 7 (Onboarding System)**:
  - เพิ่มฟิลด์ `is_onboarded` ในตาราง `profiles`
  - สร้างหน้า Onboarding Wizard (`/onboarding`) ให้ผู้ใช้ใหม่เลือกรูปแบบจัดการเงิน
  - Mode 1: รวมบัญชี (1 Wallet, 3 Buckets ผูก Wallet เดียวกัน)
  - Mode 2: แยกบัญชี (3 Wallets, 3 Buckets ผูกแยกกัน 1:1)
  - Auto Redirect ให้ผู้ใช้ใหม่ตั้งค่าให้เสร็จก่อนเข้า Dashboard
  - **Bug Fix (Onboarding Duplication)**: แก้ไขให้ Onboarding ทำการค้นหาและอัปเดต (Upsert) กระเป๋าเงินและถังเงินเดิม แทนการลบทิ้งแล้วสร้างใหม่ เพื่อป้องกันปัญหาถังเงินซ้ำซ้อนสำหรับผู้ใช้เก่าที่มีข้อมูลอยู่แล้ว
- **Milestone 7.1 (UI Performance & Animations)**:
  - เพิ่มหน้า `loading.tsx` เป็น Skeleton screen ช่วยลดเวลาแอปหน่วง (Blocking) ระหว่างเปลี่ยนหน้า (Page Transitions).
  - เพิ่ม Global Animations: `slide-up`, `fade-in` เวลาโหลดหน้าใหม่ผ่าน `template.tsx`.
  - เพิ่ม Tactile Feedback (iOS Spring): ใส่เอฟเฟกต์ยุบตัว (`active:scale-[0.98]`) ในปุ่มและ Card ต่างๆ (Wallets, Buckets, BottomNav).
  - เพิ่ม Loading Spinner (`Loader2` จาก lucide-react) เวลาผู้ใช้กดบันทึกหรือโอนเงินเพื่อแจ้งสถานะการทำงานชัดเจน.
- **Milestone 8 (Mobile App Icon Studio & 4 Handcrafted Vector Concepts)**:
  - ออกแบบไอคอนแอพสำหรับติดตั้งลงบนมือถือ (PWA / Mobile App Icon 1:1) ทั้งหมด 4 สไตล์ (100% Handcrafted Non-AI Vector SVG):
    1. `app-icon-dual-flow.svg`: Dual Flow Balance (คลื่นลูกศรคู่สมดุล รายรับ-รายจ่าย)
    2. `app-icon-pocket-fold.svg`: Geometric Pocket Fold (กระเป๋าสตางค์มินิมอล 2 เลเยอร์)
    3. `app-icon-baht-split.svg`: Digital Baht & Split Scale (เหรียญบาทดิจิทัลผสานแบ่งครึ่งสมดุล)
    4. `app-icon-monogram-s.svg`: Monogram 'S' Smart Flow (ตัวอักษร S สไตล์ Fintech สากล)
  - สร้างหน้า Interactive Mobile Mockup Studio (`/icon-preview`) พร้อม Phone Simulator บนหน้าจอ iPhone/Android จริง, Wallpaper Switcher, และแถบทดสอบ Micro-Scale Legibility (32px, 48px, 64px, 96px, 128px).

## Automated Tests
- Unit tests suite (`npm test`) ผ่านฉลุย **104/104 tests** (100% pass rate) ครอบคลุม M4 + M5 + M6.

## Next Steps
- ทดสอบการใช้งานจริงในสภาพแวดล้อม Live UAT

## Migration Required (Supabase)
Run the following SQL in Supabase SQL Editor or `supabase db push`:
```
supabase/schema_wallets.sql
supabase/schema_linked_wallets.sql
supabase/schema_onboarding.sql
```



