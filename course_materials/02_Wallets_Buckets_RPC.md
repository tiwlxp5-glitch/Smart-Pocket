# Vibe Coding Course: Smart Pocket
## Milestone 2: Unified Wallets, Buckets & ACID Transactions

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างเครื่องยนต์หลักของแอป คือ "กระเป๋าเงิน" และ "ถังงบประมาณ" รวมถึงระบบโอนเงินที่ปลอดภัย (ACID Compliance) เพื่อป้องกันปัญหาเงินหายหรือข้อมูลเพี้ยนเวลาคนใช้งานพร้อมกัน

> **💡 Antigravity Tip:** ในสเต็ปนี้มีการสร้าง RPC (Remote Procedure Call) ใน Supabase ซึ่งเป็น Logic ฐานข้อมูลที่ซับซ้อน แนะนำให้ผู้เรียนใช้คำสั่ง `/goal` นำหน้า Prompt เพื่อให้ AI จัดการแก้ปัญหาให้เสร็จสมบูรณ์รวดเดียว

---BEGIN PROMPT---
/goal Please build the Core Financial Engine (Wallets & Buckets) with ACID compliance.

### Database Schema (SQL):
1. Create `wallets` table (id, name, balance, icon, is_default).
2. Create `buckets` table (id, name, balance, default_wallet_id, target_percentage, budget_limit).
3. We need a hybrid soft-delete approach for wallets: add an `is_archived` boolean flag.
4. **CRITICAL (Deadlock Prevention):** Create a Supabase RPC `process_transfer` that handles moving money between wallets. To prevent deadlocks, ALWAYS lock the wallets (`FOR UPDATE`) in alphabetical order of their UUIDs (Least ID First).
5. Create a Supabase RPC `process_income_allocation` for single transaction ACID compliance when distributing income to buckets and linked wallets.

### Application Logic & UI:
1. Create a Server Action `src/app/actions/wallet-actions.ts` to interact with these RPCs.
2. Build `/dashboard/wallets` page with a Unified UI to manage both wallets and buckets in the same form.
3. Support "Dual Balance Setup" so users can input both transfer balance and cash on hand in one step (creating two separate wallets under the hood grouped by bank name).

### 🎓 Teaching Mode:
Before writing any code, please act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what ACID Compliance and Database Deadlocks are, and why we need Supabase RPCs (Remote Procedure Calls) to handle money transfers safely.

Please write the SQL and Next.js components. I will execute the SQL in Supabase.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
