import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, createUIMessageStreamResponse, toUIMessageStream, convertToModelMessages } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // FIX: Validate API key first — missing key is the most common production failure
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Smart Advisor] GEMINI_API_KEY is not set in environment variables!');
      return new Response(
        JSON.stringify({ error: 'API key ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    // FIX: Create google client inside the handler so errors are caught
    const google = createGoogleGenerativeAI({ apiKey });

    const { messages, context } = await req.json();

    // Normalize messages to ensure they have 'parts' array
    const normalizedMessages = messages.map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: 'text', text: m.content || '' }]
    }));

    // FIX: Strip leading assistant messages (welcome message from client-side)
    // Gemini API requires conversation to start with role: 'user'
    let filteredMessages = normalizedMessages;
    while (filteredMessages.length > 0 && filteredMessages[0].role === 'assistant') {
      filteredMessages = filteredMessages.slice(1);
    }

    // Safety: if no user messages remain, return a friendly error
    if (filteredMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'ไม่มีข้อความจากผู้ใช้' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const modelMessages = await convertToModelMessages(filteredMessages);

    const systemPrompt = `
คุณคือ "Smart Pocket Advisor" ผู้เชี่ยวชาญการเงินส่วนตัวของผู้ใช้งาน
บุคลิก: เป็นเพื่อนสนิทที่เก่งเรื่องเงิน คุยเป็นกันเอง ใช้ภาษาไทย สุภาพแต่อบอุ่น

หน้าที่ของคุณ (เฉพาะ):
1. ตอบคำถามเกี่ยวกับการเงิน การออม การลงทุน
2. วิเคราะห์ข้อมูลรายรับ-รายจ่าย และสรุปสถานการณ์การเงิน
3. ให้คำแนะนำและเคล็ดลับการจัดการเงิน
4. อธิบายข้อมูลในกระเป๋าเงินและถังงบประมาณ

ข้อมูลปัจจุบันของผู้ใช้ (Real-time Context):
- สรุปรายจ่ายเดือนนี้: ${context?.monthlyExpense ? `฿${context.monthlyExpense.toLocaleString()}` : 'ไม่ทราบ'}
- กระเป๋าเงินที่มี: ${context?.wallets?.map((w: any) => `${w.name} (คงเหลือ ฿${w.balance})`).join(', ') || 'ไม่มีข้อมูล'}
- ถังงบ/หมวดหมู่: ${context?.buckets?.map((b: any) => `${b.name} (คงเหลือ ฿${b.balance})`).join(', ') || 'ไม่มีข้อมูล'}

ข้อจำกัด:
- ❌ ห้ามบันทึกรายการธุรกรรม (ใช้ปุ่ม + ในแอพเพื่อบันทึก)
- ❌ ห้ามใช้ Tool หรือ Function ใด ๆ
- ✅ ตอบเป็นภาษาไทยเสมอ
- ✅ จัดรูปแบบด้วย Markdown: ย่อหน้า, **ตัวหนา**, รายการ, Emoji
  `;

    const result = await streamText({
      model: google('gemini-3.8-flash'),
      system: systemPrompt,
      messages: modelMessages,
    });

    // FIX: toUIMessageStream requires { stream: ReadableStream } not the result object
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });

  } catch (error: any) {
    console.error('[Smart Advisor API Error]', {
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause?.message,
    });
    return new Response(
      JSON.stringify({
        error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
