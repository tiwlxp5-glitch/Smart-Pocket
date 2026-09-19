# Vibe Coding Course: Smart Pocket
## Milestone 8: Recurring Transactions Engine

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างระบบรายการประจำ (Recurring) เช่น ตั้งค่าเน็ตบ้าน, ผ่อนรถ ให้แอปบันทึกรายจ่ายเหล่านี้ให้อัตโนมัติทุกๆ เดือนโดยที่เราไม่ต้องกรอกเอง

> **💡 Antigravity Tip:** นี่คือหัวใจสำคัญที่ซับซ้อนที่สุดของแอป แนะนำให้พิมพ์ `/goal` เพื่อให้ AI ลุยเขียน Logic ฐานข้อมูลที่ยากๆ ให้เสร็จ และหากโค้ดยาวเกินไป AI อาจหลุดโฟกัส ให้แบ่งทำทีละส่วน

---BEGIN PROMPT---
/goal Please build the Recurring Transactions System (Multi-Wallet aware).

### 1. Database (SQL):
- Create `recurring_schedules` table with RLS.
- Write `process_due_recurring_transactions` (RPC).
- **Safety Features**: IDOR guard (`auth.uid() = p_user_id`), Row Lock (`FOR UPDATE`), and a Safety Cap of 36 iterations to prevent infinite loops.
- Support Daily, Weekly, Monthly, Yearly. 
- Implement End-of-month anchor preservation (e.g., 31 Jan -> 28 Feb -> 31 Mar).
- Make it return a `has_more_pending` boolean flag so the client knows if it needs to poll again.

### 2. Lazy Evaluation Runner:
- Create a Server Action (`checkAndProcessRecurringAction`) in `src/app/actions/recurring-actions.ts`.
- Hook this into the Dashboard `page.tsx` so it automatically evaluates and inserts due transactions when the user logs in.

### 3. UI (`/dashboard/recurring`):
- Create a UI with "Monthly Commitments" KPI, Filter tabs, Toggle Active switch, and a Modal Form to create new recurring tasks.

### 🎓 Teaching Mode:
Before writing any code, act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what "Lazy Evaluation" is in the context of recurring transactions (checking when the user opens the app instead of running a cron job server), and why it saves us server costs.

Write the Next.js components and the Supabase SQL schema.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
