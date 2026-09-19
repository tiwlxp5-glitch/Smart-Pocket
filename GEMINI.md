# Smart Pocket (แอพรายรับรายจ่าย)

## Architecture Overview
- **Framework**: Next.js 16 (App Router) with React 19, Turbopack
- **Styling**: Tailwind CSS + Lucide Icons
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## Current State (Milestone 14.1 Completed - AI Chat Critical Fix & Model Upgrade)
- UI Prototyping completed (Landing Page, Login, Dashboard, Income/Expense forms, History).
- Configured Supabase Auth and Database with RLS.
- Soft-delete (Trash) system with 3-day lazy cleanup implemented.
- AI Slip Scanner implemented using Gemini 3.8 Flash (extracts Amount, Note, Receiver, and Sender Bank).
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
- **Milestone 9 (Auth UI Refactoring & Localization)**:
  - แยกหน้าต่างเข้าสู่ระบบ (Login) และสมัครสมาชิก (Signup) ออกจากกันอย่างชัดเจน (`/login` & `/signup`)
  - แปลข้อความ Error Message จากระบบ (Supabase Auth) ให้เป็นภาษาไทยทั้งหมด เพื่อให้ผู้ใช้งานเข้าใจง่ายขึ้น
- **Multi-Wallet & Transfers System (Unified Architecture) — NEW**:
  - **Unified Wallet/Bucket UI**: กระเป๋า (Wallets) และ ถังงบ (Buckets) ถูกรวมเข้าด้วยกันในหน้า UI เพื่อให้ใช้งานง่ายขึ้น (1 กระเป๋า = 1 ถังงบ เสมอ)
  - หน้าสร้าง/แก้ไขกระเป๋าเงิน (`/dashboard/wallets`) สามารถกำหนดเป้าหมายแบ่งเงิน (%) และ เพดานงบ (฿) ได้ในขั้นตอนเดียว
  - ตาราง `wallets` และ `buckets` ยังคงแยกกันในระดับฐานข้อมูลเพื่อรักษาความสมบูรณ์ของประวัติธุรกรรม แต่จัดการพร้อมกันผ่าน Server Actions
  - หน้าแรก Dashboard จัดแสดง "บัญชีธนาคาร" คู่กับถังงบโดยตรง (แสดงชื่อธนาคารและโลโก้ใน Envelope Card)
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
- **Milestone 8 (Mobile App Icon Studio & Handcrafted Vector Concepts)**:
  - ออกแบบไอคอนแอพสำหรับติดตั้งลงบนมือถือ (PWA / Mobile App Icon 1:1) ในโทนของ UI ภายในแอพจริง (In-App Tone) 4 สไตล์ (100% Non-AI Vector SVG):
    1. `app-icon-dashboard-blue.svg`: Dashboard Royal Blue (ถอดแบบจากการ์ดยอดเงินหลัก)
    2. `app-icon-clean-buckets.svg`: Clean White & 3 Buckets (คลีนการ์ดขาว + 3 ถังงบประมาณ)
    3. `app-icon-cashflow-pills.svg`: In-Out Cashflow Balance (การ์ดรับ-จ่าย +฿ / −฿ สไตล์หน้าสรุป)
    4. `app-icon-smart-wallet-app.svg`: Smart Pocket Pure Minimal (กระเป๋าไอคอนแอพ คลีนๆ สบายตา)
  - สร้างและอัปเดตหน้า Interactive Mobile Mockup Studio (`/icon-preview`) แสดงผลบน iPhone Simulator จริง พร้อม Wallpaper Switcher และ Micro-scale Legibility Test (32px - 128px).
- **Milestone 10 (Smart Add - Natural Language Input)**:
  - เพิ่มระบบบันทึกรายการด้วยเสียงและข้อความภาษาธรรมชาติ (AI-powered Natural Language Input)
  - สร้าง Server Action (`src/app/actions/smart-add-action.ts`) ที่ส่งโครงสร้างฐานข้อมูล Wallets และ Buckets จริงของผู้ใช้ไปให้ Gemini วิเคราะห์
  - รองรับการแยกประเภทรายการอัตโนมัติ (รับ/จ่าย/โอน), จำนวนเงิน, หมวดหมู่ และ กระเป๋าเงิน
  - สร้าง `SmartAddFAB.tsx` แบบ Floating Action Button รองรับ Web Speech API สำหรับพูดบันทึก
  - เชื่อมต่อฟอร์ม Income, Expense และ Transfer ผ่าน URL Parameters เพื่อ Pre-fill ข้อมูลจาก AI พร้อมรอให้ผู้ใช้กดยืนยันเพื่อความปลอดภัย (Prevent AI Hallucination)
- **Milestone 11 (Smart Advisor Chat & UI Polish)**:
  - อัปเกรดระบบ AI เป็นระบบแชทผู้เชี่ยวชาญการเงินเต็มรูปแบบ (Expert Advisor) วิเคราะห์ข้อมูลแบบ Real-time
  - รองรับ Markdown เต็มรูปแบบ (ReactMarkdown + remarkGfm) และ Bank color detection
- **Milestone 12 (AI Advisor Refactor & Quick Add Restoration)**:
  - **AI Chat ถูก Refactor ให้ทำหน้าที่เฉพาะ**: ถามตอบ / วิเคราะห์ / สรุปข้อมูลการเงิน เท่านั้น
  - **ลบ `prepareTransaction` Tool** ออกจาก AI chat route — AI ไม่บันทึกรายการอีกต่อไป
  - **ปรับ System Prompt** ชัดเจนขึ้น: ห้ามบันทึกรายการ / ห้ามใช้ Tool / ให้คำแนะนำการเงินเท่านั้น
  - **ยกระดับ Model**: อัปเกรดเป็น `gemini-3.6-flash` (อัปเดตจาก 2.0 ที่ถูกยกเลิก)
  - **สร้าง `QuickActionModal.tsx`** — Modal 4 ตัวเลือก: รายรับ / รายจ่าย / โอนเงิน / สแกนสลิป
  - **BottomNav ปุ่มกลาง** เปลี่ยนเป็นปุ่ม `+` เปิด QuickActionModal (ทดแทน AI FAB เดิม)
  - **สร้าง `OpenAIAdvisorButton.tsx`** — ปุ่มไอคอน Bot ใน Dashboard Header (มุมบนขวา) เพื่อเปิด Chat
  - **ลบ `SmartAddFAB.tsx`** — ถูกแทนที่อย่างสมบูรณ์โดย QuickActionModal
- **Milestone 13 (Smart Bank-Specific Cash Wallets & Dual Balance Setup)**:
  - เพิ่มระบบ Smart UI Grouping ในหน้า `/dashboard/wallets`
  - หากสร้างกระเป๋าเงินสด (Cash) และเลือกไอคอนธนาคารที่ตรงกับกระเป๋าดิจิทัลที่มีอยู่แล้ว ระบบจะทำการ Group ทั้ง 2 กระเป๋าไว้ใน Card Container เดียวกันอัตโนมัติ
  - แสดงผลรวม (Total Bank Net Worth) ของแต่ละธนาคารได้อย่างชัดเจนโดยไม่ต้องแก้ Database Schema (ปลอดภัย 100%)
  - **Dual Balance Setup**: ปรับปรุงหน้าสร้าง/แก้ไขบัญชีให้สามารถตั้งค่าทั้ง "ยอดเงินในบัญชี (เงินโอน)" และ "ยอดเงินสดติดตัว" ได้ในฟอร์มเดียวกัน โดยระบบหลังบ้านจะแยกสร้างและจัดการเป็น 2 กระเป๋าให้อัตโนมัติ ลดความซ้ำซ้อนให้ผู้ใช้
- **Milestone 13.1 (Global UI Polish - Dark Mode Input Fix)**:
  - แก้ไขปัญหาสีตัวอักษรในช่องกรอกข้อมูล (`input`, `textarea`, `select`) เป็นสีเทาอ่อนกลืนกับพื้นหลังเวลาผู้ใช้เปิด Dark Mode ใน OS
  - เพิ่ม Global CSS Rule บังคับให้ข้อความในช่องกรอกข้อมูลเป็นสีดำเข้ม (`#111827`) เสมอ เพื่อให้คอนทราสต์ตัดกับพื้นหลังการ์ดที่เป็น `bg-white` อย่างชัดเจน ช่วยให้อ่านง่ายขึ้นในทุกสภาพแสง
- **Milestone 13.2 (Dashboard UI Refinement)**:
  - ปรับดีไซน์ส่วน "กระเป๋าและบัญชี" ในหน้า Dashboard จาก Horizontal Carousel ขนาดใหญ่ ให้เป็น Vertical List แบบ Compact เรียบง่ายสบายตา เพื่อประหยัดพื้นที่บนหน้าจอมือถือและดูสะอาดขึ้น
- **Milestone 13.3 (History Page Categorization & Wallet Filters)**:
  - เพิ่มระบบ Filter ในหน้าประวัติการเงิน (`/dashboard/history`) แบบจัดหมวดหมู่ (Tabs: ทั้งหมด, รายรับ, รายจ่าย)
  - เพิ่ม Filter ย่อยสำหรับเจาะจงเฉพาะ "ธนาคาร/กระเป๋าเงิน" ที่ต้องการดูประวัติ
  - ใช้ URL Query Params (`searchParams`) ในการจัดการ State เพื่อให้แชร์ลิงก์ได้ และไม่กระทบการดึงข้อมูลจาก Server Components แบบเดิม (ปลอดภัยจาก Hydration Error 100%)
- **Milestone 14 (Comprehensive UI Responsiveness & Zero-Delay Navigation)**:
  - ยกเครื่องระบบ Visual Feedback ทั้งแอปเพื่อแก้ปัญหาผู้ใช้กดแล้วรู้สึก "ดีเลย์" หรือ "กดไม่ติด"
  - สร้าง `NavigationProgress.tsx` ทำหน้าที่เป็นแถบโหลด (Top Progress Bar) แสดงผลทันทีที่ผู้ใช้คลิก Link เปลี่ยนหน้า
  - ฝัง `useTransition` เข้าไปในปุ่ม Action ต่างๆ (เช่น ลบกระเป๋า, ลบประวัติ, กู้คืน) เพื่อแสดงสถานะหมุนโหลด ป้องกันการกดย้ำ
  - ฝัง `useFormStatus` ผ่าน `SubmitButton.tsx` ให้กับหน้าล็อกอินและสมัครสมาชิก
  - ทดสอบระบบครอบคลุมทุกจุด (Unit Tests เพิ่มเป็น 119 ข้อ) ผ่าน 100% Zero Regression
- **Milestone 14.1 (AI Chat Critical Fix & Model Upgrade)**:
  - แก้ไขปัญหาร้ายแรงที่ Smart Advisor AI ไม่ตอบกลับ (คิดสักพักแล้วเงียบ) พบ 4 สาเหตุ:
    1. **Gemini API ปฏิเสธ**: Welcome message (role: assistant) ถูกส่งไปเป็น turn แรก → Gemini บังคับ role: user ก่อน — แก้ด้วยการแยก Welcome เป็น Static UI Element
    2. **`sendMessage()` ใช้ signature ผิด**: ส่ง UIMessage object เต็มรูปแบบ แต่ AI SDK 7 ต้องการ `{ text: string }` — แก้ให้ตรง API
    3. **`toUIMessageStream()` syntax ผิด**: ส่ง result object ทั้งก้อน แต่ต้องส่ง `{ stream: result.stream }` — แก้ให้ destructure ถูกต้อง
    4. **ไม่มี Error Handling เลย**: ไม่มี try/catch ใน API route + ไม่แสดง error ใน UI → ผู้ใช้เห็นแค่ loader หมุนแล้วหายไป — เพิ่ม Error UI + Retry button
  - อัปเกรด AI Model ทุกจุดเป็น `gemini-3.8-flash` เพื่อหลีกเลี่ยงปัญหา 503 High Demand จากเวอร์ชัน 3.5-flash
  - ไฟล์ที่แก้ไข: `route.ts`, `SmartAdvisorChat.tsx`, `smart-add-action.ts`, `extract-action.ts`
- **Milestone 14.2 (AI Timeout & Stability Fix)**:
  - แก้ไขปัญหา AI Slip Scanner และ แชทบอทตัดจบกลางคันเนื่องจากติดข้อจำกัด Vercel Serverless Timeout (15s default).
  - เพิ่ม `export const maxDuration = 60` ใน `src/app/dashboard/layout.tsx` เพื่อให้ Server Actions ทั้งหมด (รวมถึง `extract-action.ts` ที่ใช้อ่านสลิป) ได้รับเวลาทำงานสูงสุด 60 วินาที.
- **Milestone 14.3 (Security Hardening & IDOR Fix)**:
  - แก้ไขช่องโหว่ IDOR (Insecure Direct Object Reference) ใน Supabase RPCs ที่ใช้ `SECURITY DEFINER`.
  - เพิ่มระบบตรวจจับ `auth.uid()` vs `p_user_id` ในทุก RPC (`process_expense`, `process_transfer`, `move_to_trash`, `restore_from_trash`, `process_due_recurring_transactions`).
  - สร้างไฟล์รวมแพตช์ `supabase/schema_idor_fix.sql` เพื่อให้สามารถนำไปรันบน Supabase SQL Editor ได้ทันที.

- **Milestone 14.4 (Multi-Wallet Recurring Transactions Fix)**:
  - เขียนตรรกะ RPC `process_due_recurring_transactions` ใหม่ใน `supabase/schema_recurring_fix.sql` เพื่อให้รองรับระบบ Multi-Wallet (Milestone 6) อย่างสมบูรณ์
  - **Expense**: ดึง `default_wallet_id` จาก bucket มาใช้บันทึกลงใน `transactions` และหักเงินจาก `wallets`
  - **Income**: รองรับการระบุ `wallet_id` ตรงๆ พร้อมระบบ Allocate อัตโนมัติไปยัง `wallets` ที่ผูกกับ buckets ผ่าน `process_transfer` logic ภายใน RPC

## Automated Tests
- Unit tests suite (`npm test`) ผ่านฉลุย **119/119 tests** (100% pass rate) ครอบคลุมถึง M14.1 (AI Chat Fix).

## Next Steps
- ทดสอบการใช้งานจริงในสภาพแวดล้อม Live UAT

## Migration Required (Supabase)
Run the following SQL in Supabase SQL Editor or `supabase db push`:
```
supabase/schema_wallets.sql
supabase/schema_linked_wallets.sql
supabase/schema_onboarding.sql
supabase/schema_fix_cascade_delete.sql
supabase/schema_recurring_fix.sql
```

## AI SDK & Vercel Best Practices (Lessons Learned)
When modifying or creating new AI endpoints using `@ai-sdk/google` and `ai` (v7) in this Vercel environment, YOU MUST follow these rules:

1. **Defensive Client Initialization**: 
   - NEVER initialize the AI client (e.g., `createGoogleGenerativeAI`) at the module level. 
   - ALWAYS initialize it INSIDE the request handler's `try/catch` block.
   - ALWAYS validate the presence of `process.env.GEMINI_API_KEY` before initialization to prevent silent 500 errors on Vercel.

2. **Vercel Route Configuration**:
   - Always include `export const maxDuration = 60;` (or higher) in AI routes.
   - Always include `export const runtime = 'nodejs';` to ensure maximum compatibility with the AI SDK streaming methods.

3. **Streaming Responses**:
   - Use `return result.toUIMessageStreamResponse();` directly on the `streamText` result object. Do not attempt to manually chain `toUIMessageStream` and `createUIMessageStreamResponse`.
   - Always include an `onError: (event) => console.error(...)` callback in `streamText` for Vercel logging.

4. **Prompt-Driven UI Hooks (Markdown Interception)**:
   - To dynamically style specific entities (like Bank names) in the UI, instruct the AI via System Prompt to wrap them in a specific markdown syntax (e.g., `**[Entity]**`). 
   - Intercept these tags (`<strong>`, `<em>`) via `ReactMarkdown` custom components on the client to apply styles (like `preset.color`) safely without complex Regex text parsing.
