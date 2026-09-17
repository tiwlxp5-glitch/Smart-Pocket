# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 3 Completed - Analytics & Charts)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Configured Supabase Auth and Database with RLS.
- Soft-delete (Trash) system with 3-day lazy cleanup implemented.
- AI Slip Scanner implemented using Gemini 3.6 Flash (extracts Amount, Note, and Receiver).
- App metadata and PWA settings updated for mobile installation ("รายรับรายจ่าย").
- **Interactive Analytics & Charts System (`/dashboard/analytics`)**:
  - Time filters: สัปดาห์นี้ (This Week), เดือนนี้ (This Month), เดือนที่แล้ว (Last Month), ปีนี้ (This Year), ทั้งหมด (All Time).
  - Cashflow Bar Chart (รายรับ vs รายจ่าย แยกรายวัน/สัปดาห์/เดือน).
  - Expense Donut Chart (สัดส่วนรายจ่ายแยกตามกระเป๋าเงิน).
  - Financial Health KPIs: Net Cash Flow, Savings Rate %, Top 5 Spends.
  - BottomNav upgraded to 5 standard tabs.
  - Dashboard home quick insight card added.

## Next Steps (Milestone 4)
1. **User Profile Settings**: Allow users to change their display name, currency preference, and manage connected accounts.
2. **Export Data**: Add feature to export transaction history to CSV/Excel.
3. **Budget Limit Alerts**: Notify when bucket spending exceeds monthly target.
