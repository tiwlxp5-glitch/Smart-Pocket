import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages } from 'ai';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Validate API key first
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Smart Advisor] Missing GEMINI_API_KEY');
      return new Response(
        JSON.stringify({ error: 'API key ไม่ได้ตั้งค่า' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const { messages, context } = await req.json();

    // Normalize messages
    const normalizedMessages = messages.map((m: any) => ({
      ...m,
      parts: m.parts || [{ type: 'text', text: m.content || '' }]
    }));

    // Strip leading assistant messages — Gemini requires first turn = user
    let filteredMessages = normalizedMessages;
    while (filteredMessages.length > 0 && filteredMessages[0].role === 'assistant') {
      filteredMessages = filteredMessages.slice(1);
    }

    if (filteredMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'ไม่มีข้อความจากผู้ใช้' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const modelMessages = await convertToModelMessages(filteredMessages);

    const systemPrompt = `
คุณคือ "Smart Pocket Advisor" ผู้เชี่ยวชาญการเงินส่วนตัวของผู้ใช้งาน
บุคลิก: เป็นผู้เชี่ยวชาญทางการเงินที่สุภาพ อบอุ่น เป็นมืออาชีพ และน่าเชื่อถือ

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
- ❌ ห้ามใช้คำว่า "เพื่อน" หรือพูดด้วยน้ำเสียงที่สนิทสนมแบบเพื่อนเด็ดขาด
- ❌ ห้ามเรียกชื่อผู้ใช้หรือใช้คำนำหน้าชื่อผู้ใช้ (ให้คุยโต้ตอบไปตามปกติได้เลย)
- ❌ ห้ามบันทึกรายการธุรกรรม (ใช้ปุ่ม + ในแอพเพื่อบันทึก)
- ❌ ห้ามใช้ Tool หรือ Function ใด ๆ
- ✅ ตอบเป็นภาษาไทยเสมอ
- ✅ เมื่อกล่าวถึง "ชื่อกระเป๋าเงิน" หรือ "ธนาคาร" (เช่น ออมสิน, KBank, เงินสด, บัตรเครดิต) **ต้องพิมพ์ตัวหนาเสมอ** (เช่น **ออมสิน**, **KBank**) เพื่อให้ระบบแสดงสีอัตโนมัติ
- ✅ จัดรูปแบบด้วย Markdown: ย่อหน้า, **ตัวหนา**, รายการ, Emoji
    `;

    const result = streamText({
      model: google('gemini-3.8-flash'),
      system: systemPrompt,
      messages: modelMessages,
      onError: (event) => {
        console.error('[Smart Advisor streamText error]', event.error);
      },
    });

    // Use the result object's built-in response method — most compatible with Vercel
    return result.toUIMessageStreamResponse({
      onError: (error: unknown) => {
        const errorString = String(error);
        if (errorString.includes('quota') || errorString.includes('429')) {
          return 'โควตาใช้งาน AI ฟรีเต็มแล้ว (Limit 20 requests) กรุณาลองใหม่ในภายหลังครับ';
        }
        if (errorString.includes('503') || errorString.includes('high demand') || errorString.includes('overloaded')) {
          return 'เซิร์ฟเวอร์ AI มีผู้ใช้งานหนาแน่นมาก กรุณาลองใหม่อีกครั้งครับ';
        }
        return 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI';
      }
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
        detail: error.message,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
