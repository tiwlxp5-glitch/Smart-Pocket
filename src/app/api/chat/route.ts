import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, createUIMessageStreamResponse, toUIMessageStream, convertToModelMessages } from 'ai';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, context } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const systemPrompt = `
คุณคือ "Smart Pocket" ที่ปรึกษาทางการเงินส่วนตัวของผู้ใช้งาน บุคลิกของคุณคือเป็นเพื่อนสนิทที่เก่งเรื่องเงิน คุยเป็นกันเอง ใช้คำว่า "ผม/หนู/เรา" กับ "คุณ/แก" มีความสุภาพแต่น่ารักและเข้าถึงง่าย 
คุณให้คำปรึกษา แนะนำการใช้เงิน และสามารถรับคำสั่ง "บันทึกรายการ" เช่น รายรับ รายจ่าย โอนเงินได้

ข้อมูลปัจจุบันของผู้ใช้ (Real-time Context):
- สรุปรายจ่ายเดือนนี้: ${context?.monthlyExpense ? `฿${context.monthlyExpense.toLocaleString()}` : 'ไม่ทราบ'}
- กระเป๋าเงินที่มี (Wallets): ${context?.wallets?.map((w: any) => `${w.name} (คงเหลือ ฿${w.balance})`).join(', ') || 'ไม่มีข้อมูล'}
- ถังเงิน/หมวดหมู่ที่มี (Buckets): ${context?.buckets?.map((b: any) => `${b.name} (คงเหลือ ฿${b.balance})`).join(', ') || 'ไม่มีข้อมูล'}

กฎการบันทึกรายการ:
1. หากผู้ใช้บอกให้บันทึกรายการ (เช่น "วันนี้กินข้าว 150") ให้คุณเรียกใช้เครื่องมือ (Tool) ที่ชื่อว่า \`prepareTransaction\` โดยสรุปข้อมูลให้ตรงกับที่ผู้ใช้บอก
2. หากข้อมูลไม่ครบ ให้เดาจากสิ่งที่เหมาะสม หรือถามกลับเพื่อความแน่ใจก็ได้
3. เมื่อเรียก Tool เสร็จ ให้ตอบกลับสั้นๆ เชิงยืนยัน
4. สำคัญมาก: จัดหน้าตาการตอบกลับให้เป็นระเบียบ อ่านง่าย ดูมืออาชีพ ใช้ย่อหน้า (Paragraphs), เว้นบรรทัด, การเน้นข้อความ (Bold), และ Emoji ประกอบให้สวยงาม
  `;

  const result = await streamText({
    model: google('gemini-3.6-flash'),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      prepareTransaction: tool({
        description: 'เตรียมข้อมูลเพื่อบันทึกรายการรายรับ, รายจ่าย, หรือโอนเงิน รอให้ผู้ใช้กดยืนยัน',
        inputSchema: z.object({
          type: z.enum(['income', 'expense', 'transfer']).describe('ประเภทรายการ: income (รายรับ), expense (รายจ่าย), transfer (โอนเงิน)'),
          amount: z.number().describe('จำนวนเงิน (ต้องเป็นตัวเลขบวก)'),
          note: z.string().optional().describe('บันทึกช่วยจำ (ถ้ามี)'),
          bucketId: z.string().optional().describe('ID ของถังเงิน/หมวดหมู่ (สำหรับ income และ expense)'),
          walletId: z.string().optional().describe('ID ของกระเป๋าเงิน (กระเป๋าที่รับเงิน/จ่ายเงิน/ต้นทางโอน)'),
          toWalletId: z.string().optional().describe('ID ของกระเป๋าเงินปลายทาง (เฉพาะกรณี transfer)'),
        }),
      })
    }
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(result),
  });
}
