'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'

type WalletInfo = { id: string, name: string, bank_name: string | null }
type BucketInfo = { id: string, name: string }

export async function parseSmartAddText(text: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Not logged in')
    }

    // 1. Fetch user's wallets and buckets to provide context to AI
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, name, bank_name')
      .eq('user_id', user.id)
      .eq('is_archived', false)

    const { data: buckets } = await supabase
      .from('buckets')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_archived', false)

    if (!wallets || !buckets) {
      throw new Error('Could not load wallets or buckets')
    }

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' })

    const walletsStr = JSON.stringify(wallets)
    const bucketsStr = JSON.stringify(buckets)

    const prompt = `
      คุณคือผู้เชี่ยวชาญด้านการจัดหมวดหมู่รายรับรายจ่าย
      จงวิเคราะห์ข้อความต่อไปนี้: "${text}"
      
      แล้วสกัดข้อมูลออกมาเป็น JSON format เท่านั้น ห้ามมีคำอธิบายอื่น ห้ามมี backticks (\`\`\`)
      
      รูปแบบ JSON ที่ต้องการ:
      {
        "type": "expense" | "income" | "transfer",
        "amount": ตัวเลข (Number),
        "note": "ข้อความบันทึกช่วยจำ (String)",
        "category": "หมวดหมู่ทั่วไป เช่น อาหาร, เดินทาง, ช้อปปิ้ง, เงินเดือน",
        "wallet_id": "UUID ของกระเป๋าเงิน (String) ที่สอดคล้องที่สุด (หรือ null)",
        "bucket_id": "UUID ของถังเงิน (String) ที่สอดคล้องที่สุด (สำหรับ expense/income) (หรือ null)",
        "to_wallet_id": "UUID ของกระเป๋าเงินปลายทาง (String) เฉพาะกรณี type เป็น transfer (หรือ null)"
      }
      
      ข้อมูลอ้างอิงของผู้ใช้ (ใช้ ID จากข้อมูลเหล่านี้เท่านั้น):
      Wallets: ${walletsStr}
      Buckets: ${bucketsStr}
      
      เงื่อนไข:
      - พยายามจับคู่คำพูดกับชื่อกระเป๋า (name หรือ bank_name) และชื่อถังเงิน (name) ให้แม่นยำที่สุด
      - หากเป็นค่าใช้จ่าย (expense) พยายามเลือก bucket_id ให้ตรงกับหมวดหมู่
      - หากเป็นรายรับ (income) อาจจะยังไม่ต้องมี bucket_id ก็ได้ ยกเว้นระบุชัดเจน
      - หากเป็นการโอนเงิน (transfer) ต้องมีทั้ง wallet_id (ต้นทาง) และ to_wallet_id (ปลายทาง)
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // ทำความสะอาดข้อความเผื่อ AI ใส่ Markdown มา
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
    
    return { success: true, data: JSON.parse(cleanedText) }
  } catch (error: any) {
    console.error('Error parsing smart add text:', error)
    return { success: false, message: error.message || 'ไม่สามารถวิเคราะห์ข้อมูลได้' }
  }
}
