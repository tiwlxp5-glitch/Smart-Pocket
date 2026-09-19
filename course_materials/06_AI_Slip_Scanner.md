# Vibe Coding Course: Smart Pocket
## Milestone 6: AI Slip Scanner & Image Cloud Backup

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างระบบสแกนสลิปโอนเงินด้วย AI โดยผู้ใช้แค่อัปโหลดรูปสลิป AI ก็จะอ่านยอดเงินและรายละเอียดต่างๆ ไปกรอกลงฟอร์มให้เอง

> **💡 Antigravity Tip:** ระบบ AI อ่านสลิปอาจจะเจอของเล่นใหม่ๆ จาก Vercel/Gemini ให้พิมพ์ `/browser` ก่อนเริ่ม เพื่อให้ AI ค้นหาวิธีแก้ Timeout บน Vercel ล่าสุด

---BEGIN PROMPT---
/browser Search for "Vercel Serverless Function maxDuration configuration Next.js App Router" and read the docs to ensure we configure timeout limits correctly.

After researching, please implement the AI Slip Scanner feature:

### 1. Receipt Image Cloud Backup:
- Create an image uploader that compresses images into a JPEG Blob (max 1200px, quality 0.7) on the client side before uploading to save storage.
- Save the path in the database.
- Create a `SlipLightbox` component (`src/components/SlipLightbox.tsx`) that shows a paperclip 📎 badge. Clicking it opens a Modal to view the receipt.

### 2. AI Slip Scanner Engine (`extract-action.ts`):
- Set `export const maxDuration = 60` in the route/action file to prevent the 15s Vercel timeout.
- Use `@ai-sdk/google` (Gemini 3.8 Flash model).
- ALWAYS initialize the AI client (`createGoogleGenerativeAI`) INSIDE the request handler's `try/catch` block, not at the module level.
- Extract Amount, Note, Receiver, and Sender Bank from the receipt image.
- Pre-fill this data into the Expense form.

### 🎓 Teaching Mode:
Before writing any code, act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) why compressing images on the client side before uploading is important, and how Serverless Timeouts (like Vercel's 15s limit) can interrupt AI processes if we don't set `maxDuration`.

Build the UI and Server Action for this workflow.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
