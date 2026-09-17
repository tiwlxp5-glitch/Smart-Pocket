# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 5.2 Completed - Receipt Image Cloud Backup)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Configured Supabase Auth and Database with RLS.
- Soft-delete (Trash) system with 3-day lazy cleanup implemented.
- AI Slip Scanner implemented using Gemini 3.6 Flash (extracts Amount, Note, and Receiver).
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
  - Auto-process notification banner บน Dashboard และ Shortcut Card.
  - Security hardening: REVOKE/GRANT ป้องกัน anonymous PostgREST calls.
- **Receipt Image Cloud Backup — NEW**:
  - อัปโหลดสลิปเป็น compressed JPEG Blob (max 1200px, quality 0.7) แทน original file ประหยัด Storage.
  - `SlipLightbox` component (`src/components/SlipLightbox.tsx`): Self-contained badge 📎 + Modal.
  - หน้า History แสดง badge "มีสลิป" บนรายการที่มีรูป — กดเพื่อเปิด Lightbox ดูในแอพได้ทันที.
  - Supabase Storage public bucket `slips` (มีอยู่แล้ว).
- **Automated Tests**:
  - Unit tests suite (`npm test`) ผ่านฉลุย **87/87 tests** (100% pass rate) ครอบคลุม M4 + M5 Unit + M5 Adversarial + M5 Stress.

## Next Steps
- ไม่มี Milestone ที่วางแผนไว้แล้ว — รอ brainstorm feature ใหม่ตามความต้องการจริง.

## Migration Required (Supabase)
Run the following SQL in Supabase SQL Editor or `supabase db push`:
```
supabase/schema_recurring.sql
```


