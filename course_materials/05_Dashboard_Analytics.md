# Vibe Coding Course: Smart Pocket
## Milestone 5: Dashboard Server Component & Analytics

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างหน้าแรก (Dashboard) ที่สรุปยอดเงินทั้งหมด และหน้ากราฟสถิติ (Analytics) โดยใช้เทคนิคแยกไฟล์คำนวณ (Service) ออกจาก UI เพื่อไม่ให้โค้ดยาวเกินไป

> **💡 Antigravity Tip:** การสร้าง Dashboard มีการประมวลผลข้อมูลเยอะมาก แนะนำให้ใช้ `/goal` เพื่อให้ AI ใช้เวลาคิดนานๆ และรันโค้ดจนเสร็จ

---BEGIN PROMPT---
/goal We are building the core Dashboard and Analytics pages. Avoid the "God Component" anti-pattern by separating data logic from UI.

### 1. Dashboard Refactoring (`/dashboard/page.tsx`):
- Extract complex data calculations (Net Worth, Budget Alerts, Total Income/Expense) into a new service file: `src/utils/dashboardService.ts`.
- Make `page.tsx` a pure Server Component that acts as a Controller (fetches data via service, passes to JSX).
- Implement a Vertical List UI for "Wallets and Accounts" (Compact and clean, replacing the old horizontal carousel).
- Add tactile feedback (iOS Spring `active:scale-[0.98]`) to cards.

### 2. Interactive Analytics (`/dashboard/analytics`):
- Create an Analytics page with Time filters: สัปดาห์นี้, เดือนนี้, เดือนที่แล้ว, ปีนี้, ทั้งหมด.
- Include a Cashflow Bar Chart and an Expense Donut Chart.
- Show Financial Health KPIs: Net Cash Flow, Savings Rate %, Top 5 Spends.

### 🎓 Teaching Mode:
Before writing any code, act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what the "God Component" anti-pattern is and why separating logic into a `dashboardService.ts` is good for AI-assisted coding (Vibe Coding).

Please build these components keeping Clean Architecture in mind.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
