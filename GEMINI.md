# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 4 Completed - User Settings, Export CSV & Budget Alerts)
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
- **Automated Tests**:
  - Unit tests suite (`npm test` via `tests/milestone4.test.mjs`) covering math, validation, and CSV format with 100% pass rate.

## Next Steps (Milestone 5)
1. **Recurring Transactions**: ระบบบันทึกรายจ่าย/รายรับประจำอัตโนมัติ (เช่น ค่าเน็ต, คอนโด, Netflix).
2. **Multi-Currency Support**: รองรับการแปลงและบันทึกสกุลเงินต่างประเทศแบบ Real-time.
3. **Receipt Image Cloud Backup**: ระบบจัดเก็บภาพสลิปใบเสร็จบน Supabase Storage พร้อมการดาวน์โหลดเป็นชุด.

