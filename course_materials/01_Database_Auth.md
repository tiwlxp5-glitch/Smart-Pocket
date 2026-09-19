# Vibe Coding Course: Smart Pocket

## Milestone 1: Database & Authentication

**🎯 เป้าหมายของไฟล์นี้:**
สั่งให้ AI เชื่อมต่อกับ Supabase และสร้างระบบสมาชิก (Login/Signup) รวมถึงการรักษาความปลอดภัย (RLS) ที่ช่วยให้ข้อมูลการเงินของเราเป็นความลับ คนอื่นไม่สามารถเข้าถึงได้

> **คำแนะนำสำหรับผู้เรียน:** ก๊อปปี้ข้อความด้านล่างให้ AI ใน **Antigravity** เพื่อสร้างระบบฐานข้อมูลและการเข้าสู่ระบบที่ปลอดภัย (Supabase)

---BEGIN PROMPT---
Now that the project is set up, let's build the foundation: Database & Auth via Supabase.

### Your Task (Milestone 1):

1. **Supabase Client Setup**: Create a robust Supabase client setup for Next.js App Router (Server Actions and Client Components). Create `utils/supabase/server.ts` and `utils/supabase/client.ts`.
2. **Database Schema (SQL)**: Write a `.sql` file (`supabase/schema_auth_profiles.sql`) to create a `profiles` table. It should link to Supabase Auth (`auth.users`) using a trigger so that when a new user signs up, a profile is automatically created.
3. **RLS (Row Level Security)**: Enable RLS on the `profiles` table. Users should only be able to SELECT and UPDATE their own profile (`auth.uid() = id`).
4. **Auth UI Component**: Create simple but modern `/login` and `/signup` pages using Tailwind CSS. Use Server Actions to handle sign up and login processes.
5. **Middleware**: Create a `middleware.ts` to protect the `/dashboard` route. If a user is not logged in, redirect them to `/login`.

### 🎓 Teaching Mode:

Before writing any code, please act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what RLS (Row Level Security) is, why it's critical for a finance app, and how the Auth system works in this step.

Please write the Next.js code and the SQL script. I will run the SQL in my Supabase SQL Editor manually.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
