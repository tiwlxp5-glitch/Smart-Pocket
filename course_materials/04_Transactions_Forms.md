# Vibe Coding Course: Smart Pocket
## Milestone 4: Transaction Forms & Quick Actions

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างหน้าบันทึกรายรับ รายจ่าย และโอนเงิน พร้อมระบบ Quick Action ตรงเมนูด้านล่าง (Bottom Nav) ที่กดเรียกใช้งานได้อย่างรวดเร็ว

> **💡 Antigravity Tip:** หน้าจอรับจ่ายเงินมีการเชื่อมโยง Data หลายส่วน แนะนำให้พิมพ์ `/grill-me` (ให้ AI สัมภาษณ์เราก่อน) เพื่อเคลียร์ความเข้าใจกับ AI ให้ตรงกันก่อนเริ่มให้มันเขียนโค้ด

---BEGIN PROMPT---
/grill-me Please interview me about the best UX approach for the Income, Expense, and Transfer forms in Smart Pocket before writing the code. Here is the context of what needs to be built:

1. **Quick Action Modal**: Replace the bottom nav center button with a "+" button that opens a `QuickActionModal.tsx` offering 4 choices: Income, Expense, Transfer, and Scan Slip.
2. **Expense Form (`/dashboard/expense`)**: 
   - Refactor it into a Server Component (to avoid white loading screens). 
   - Fetch `wallets` and `buckets` from Supabase on the server.
   - Include Budget Alerts (Warning at >= 80%, Alert at >= 100%).
3. **Auto-Select Logic**: When a user selects a Bucket in the Expense or Income form, automatically select the linked `default_wallet_id`.
4. **Client-side Form UI**: Create `ExpenseFormClient.tsx` using `useFormStatus` to show a Loading Spinner (`Loader2` from lucide-react) when saving data.
5. Use `toast.error()` or `toast.success()` from `sonner` instead of native `alert()` for all error/success messages.

### 🎓 Teaching Mode:
Before asking me interview questions, act as a friendly programming mentor and briefly explain to me in Thai (ภาษาไทย) the difference between Server Components and Client Components in Next.js, and why we are separating them for this form.

Ask me a few design questions to ensure the flow is perfect, then we can proceed with writing the code.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.when coding is done.
