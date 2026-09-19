# Vibe Coding Course: Smart Pocket

## Milestone 0: Master Context & Setup

**🎯 เป้าหมายของไฟล์นี้:**
ไฟล์นี้คือ "หัวใจ" ในการเริ่มต้นโปรเจกต์ เป็นการเซ็ตอัปโครงสร้างพื้นฐานของ Next.js และสร้างไฟล์ `GEMINI.md` เพื่อให้ AI มีความจำ (Context) ว่าแอปนี้คืออะไร ป้องกัน AI หลอนในอนาคต

> **คำแนะนำสำหรับผู้เรียน:** ก๊อปปี้ข้อความด้านล่างทั้งหมด (ตั้งแต่ `---BEGIN PROMPT---` ลงไป) ไปวางในช่องแชทของ **Antigravity** เพื่อให้ AI ตั้งค่าโปรเจกต์และเข้าใจภาพรวมทั้งหมดของแอปที่เราจะสร้าง

---BEGIN PROMPT---
You are an expert Next.js (App Router) and Supabase developer. We are going to build a personal finance app called "Smart Pocket".

### Tech Stack:

- Framework: Next.js 16 (App Router) with React 19
- Styling: Tailwind CSS + Lucide Icons
- Database & Auth: Supabase (PostgreSQL with RLS)
- UI Library: sonner (for Toasts)

### Project Core Concepts:

- The app allows users to manage multiple "Wallets" (กระเป๋าเงิน).
- Each Wallet has a 1:1 relationship with a "Bucket" (ถังงบประมาณ).
- Users can record Income, Expense, and Transfer between wallets.
- All financial math must be precise and ideally handled via Supabase RPCs for ACID compliance in later steps.
- **CRITICAL RULE:** All user-facing UI text, buttons, labels, and error messages MUST be written in Thai language (ภาษาไทย).

### Your Task (Milestone 0):

1. Initialize the base structure for the Next.js project.
2. Install necessary dependencies: `supabase-js`, `lucide-react`, `sonner`, `date-fns`.
3. Set up a Global Layout (`app/layout.tsx`) that includes the `<Toaster />` from `sonner` for global error/success notifications.
4. Prepare an empty `GEMINI.md` in the root directory where we will log our architecture and feature milestones as we build.
5. Create a simple `page.tsx` (Landing Page) with a modern UI saying "Welcome to Smart Pocket" to verify Tailwind is working.

### 🎓 Teaching Mode:

Before writing any code, please act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what we are building in this step, why it's important, and how the Tech Stack works together so I can understand the foundation.

Please write the code, execute the necessary terminal commands to set this up, and finally use the terminal to run `npm run dev` in the background so I can preview the app immediately. After that, please write the initial project setup and tech stack into the `GEMINI.md` file to start tracking our progress.
