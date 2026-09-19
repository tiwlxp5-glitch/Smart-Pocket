# Vibe Coding Course: Smart Pocket
## Milestone 9: Edge Cases & Optimization (Enterprise Level)

**🎯 เป้าหมายของไฟล์นี้:** 
เก็บตกแก้บั๊กแปลกๆ ที่แอปทั่วไปมักจะพังเวลาเอาไปใช้จริง (เช่น ปัญหาเวลาเพี้ยนเพราะ Server อยู่ต่างประเทศ, หรือปัญหาเงินค้างระบบเวลาซ่อนกระเป๋า)

> **💡 Antigravity Tip:** การแก้บั๊กแปลกๆ เป็นเรื่องปกติ ให้ผู้เรียนรู้ว่าเราสามารถให้ AI ค้นหาวิธีแก้ หรือใช้คำสั่ง `/learn` เพื่อสอน AI ในสิ่งที่มันทำผิดพลาดได้

---BEGIN PROMPT---
We need to finalize the app by fixing edge cases and optimizing the UX based on Enterprise standards.

### 1. The Timezone Trap:
- Vercel runs on UTC. Create `src/utils/timezone.ts` using `Intl.DateTimeFormat` with `timeZone: 'Asia/Bangkok'`.
- Apply this timezone utility to `/dashboard/expense/page.tsx`, `/dashboard/page.tsx`, and CSV/Excel exports to ensure dates don't shift by 7 hours.

### 2. Ghost Money Bug (Soft Delete Edge Case):
- Fix the logic for the Trash system (restoring or trashing).
- Update the Supabase RPCs `restore_from_trash` and `move_to_trash` so that if a wallet is updated, we forcefully unhide it (`is_archived = false`) if it was previously archived. This prevents hidden wallets with non-zero balances.

### 3. IDOR Security Hardening:
- Ensure all RPCs (`process_expense`, `process_transfer`, etc.) have a strict check: `auth.uid() = p_user_id`. Do not rely solely on RLS when using `SECURITY DEFINER`.

### 4. Global UI Polish:
- Fix Dark Mode Input: Force `#111827` text color on `input`, `textarea`, `select` so text is visible on white backgrounds even if the user's OS is in Dark Mode.
- Add `NavigationProgress.tsx` (Top Progress Bar) using Next.js `useTransition` to eliminate the feeling of lag during page navigation.

### 🎓 Teaching Mode:
Before writing any code, act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) what "IDOR" (Insecure Direct Object Reference) is and why checking `auth.uid()` manually inside a `SECURITY DEFINER` RPC is essential for stopping hackers.

Please generate the necessary patches and UI updates.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
