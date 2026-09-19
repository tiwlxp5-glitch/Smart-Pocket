# Vibe Coding Course: Smart Pocket
## Milestone 3: Onboarding Wizard & User Settings

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างหน้า Onboarding ต้อนรับผู้ใช้ใหม่ เพื่อให้เขาเลือกว่าจะจัดการเงินแบบ "รวมบัญชี" หรือ "แยกบัญชี" และสร้างหน้าตั้งค่าโปรไฟล์ (Settings)

> **💡 Antigravity Tip:** ให้ผู้เรียนป้อน Prompt ด้านล่างตามปกติ ถ้า AI ถามยืนยันการติดตั้งไลบรารีเพิ่มเติม ให้กดอนุมัติได้เลย

---BEGIN PROMPT---
We need to build a smooth Onboarding experience and a Settings page for the user.

### 1. Onboarding System (`/onboarding`):
- Add an `is_onboarded` boolean field to the `profiles` table.
- Create an Onboarding Wizard page. 
- The wizard should ask the user to choose between two modes:
  - **Mode 1 (รวมบัญชี):** 1 Wallet, 3 Buckets (all linked to the same wallet).
  - **Mode 2 (แยกบัญชี):** 3 Wallets, 3 Buckets (linked 1:1).
- Prevent duplicate data creation if an existing user hits onboarding (use Upsert instead of Delete & Create).
- Redirect users to `/onboarding` automatically if they log in but `is_onboarded` is false (update `middleware.ts`).

### 2. Settings Page (`/dashboard/settings`):
- Form to update Profile display name.
- Form to update the user's password securely via Supabase Auth.
- UI to set monthly budget limits for each Bucket, and select which Wallet is linked to which Bucket as default.

### 🎓 Teaching Mode:
Before writing any code, please act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) the logic behind this Onboarding wizard, and how Next.js Middleware works to protect routes and redirect users safely.

Please implement these features using Tailwind CSS and Next.js Server Actions.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
