import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, createUIMessageStreamResponse, toUIMessageStream, convertToModelMessages } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

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
    model: google('gemini-2.0-flash'),
    system: systemPrompt,
    messages: modelMessages,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(result),
  });
}
