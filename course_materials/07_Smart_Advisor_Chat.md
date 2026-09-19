# Vibe Coding Course: Smart Pocket
## Milestone 7: Smart Advisor Chat (Expert AI)

**🎯 เป้าหมายของไฟล์นี้:** 
สร้างแชทบอทผู้เชี่ยวชาญการเงินส่วนตัว (Smart Advisor) ที่วิเคราะห์ข้อมูลการเงินของเราแล้วให้คำปรึกษาผ่านหน้า Dashboard ได้ทันที

> **💡 Antigravity Tip:** AI SDK มีการอัปเดตเวอร์ชันบ่อย ให้พิมพ์ `/browser` ก่อนเพื่อให้ AI เช็ควิธีใช้ `ai` และ `@ai-sdk/google` เวอร์ชัน 7 ล่าสุด เพื่อป้องกัน Error 

---BEGIN PROMPT---
/browser Search for "@ai-sdk/google streamText examples Vercel AI SDK v7" to get the latest syntax for streaming UI messages.

Next, let's implement the Smart Advisor Chat (Expert Financial Advisor):

### 1. The Route (`app/api/chat/route.ts`):
- Ensure `export const maxDuration = 60` and `export const runtime = 'nodejs'`.
- Initialize `gemini-3.8-flash` inside the POST handler.
- The AI should act purely as a Financial Advisor (answering questions, analyzing data). It MUST NOT attempt to execute tools or save transactions.
- Fix Vercel AI SDK v7 signature bugs: Use `return result.toUIMessageStreamResponse()` directly.
- Ensure robust error handling (try/catch) so the UI doesn't hang on 500 errors.

### 2. The Chat UI (`SmartAdvisorChat.tsx`):
- Create `OpenAIAdvisorButton.tsx` in the Dashboard Header to open the chat modal.
- Render responses using `ReactMarkdown` and `remarkGfm`.
- Separate the "Welcome Message" into a static UI element rather than forcing the AI to generate it on turn 1 (which crashes Gemini API).
- Add error UI with a Retry button if the stream fails.

### 🎓 Teaching Mode:
Before writing any code, act as a friendly programming mentor. Briefly explain to me in Thai (ภาษาไทย) how streaming responses work in Next.js (why text appears letter by letter instead of waiting for the whole response).

Build these components now.
If the dev server is not running, please run `npm run dev` in the background. Finally, please update the `GEMINI.md` file to log the new features and architectural changes we just made.
