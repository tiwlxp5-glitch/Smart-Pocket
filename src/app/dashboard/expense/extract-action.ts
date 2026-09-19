'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

export async function extractSlipData(base64Image: string, mimeType: string) {

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' })

    const prompt = `
      คุณคือผู้เชี่ยวชาญด้านการอ่านสลิปโอนเงินของไทย
      จงวิเคราะห์รูปภาพสลิปนี้ และสกัดข้อมูลออกมาเป็น JSON format เท่านั้น โดยไม่ต้องมี backticks หรือคำอธิบายเพิ่มเติม
      รูปแบบ JSON ที่ต้องการ:
      {
        "amount": 150.50,
        "note": "ดึงข้อความจาก 'บันทึกช่วยจำ' บนสลิป (ถ้าไม่มีบันทึกช่วยจำเลย ให้ส่งกลับเป็นค่าว่าง '')",
        "receiver": "ชื่อผู้รับเงิน หรือ ชื่อร้านค้า จากหัวข้อ 'ถึง' หรือ 'ผู้รับ'",
        "sender_bank": "รหัสหรือชื่อธนาคารของผู้โอนเงินต้นทาง เช่น 'kbank', 'scb', 'bbl', 'ktb', 'ttb', 'bay', 'gsb', 'truemoney' (ถ้าไม่ทราบให้ใส่ null)",
        "transaction_date": "ดึงวันและเวลาจากสลิป คืนค่าในรูปแบบ ISO 8601 (YYYY-MM-DDTHH:mm:ss+07:00) โดยให้บวก +07:00 เสมอ (ถ้าไม่มีหรือหาไม่เจอให้ใส่ null)"
      }
      หมายเหตุ: 
      - amount ต้องเป็นตัวเลข Number ล้วน ไม่มีเครื่องหมายลูกน้ำ
      - ถ้ามีการพิมพ์บันทึกช่วยจำ ให้เอามาใส่ใน note
      - sender_bank ให้ดูจากโลโก้หรือชื่อธนาคารต้นทางที่โอนออก
      - ปีบนสลิปส่วนใหญ่เป็น พ.ศ. (เช่น 2567) ให้นำไปแปลงเป็น ค.ศ. ก่อน (เช่น 2567 - 543 = 2024) คืนค่าใน JSON เป็น ค.ศ. เสมอ
    `

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      }
    ]

    const result = await model.generateContent([prompt, ...imageParts])
    const text = result.response.text()
    
    // ทำความสะอาดข้อความเผื่อ AI ใส่ Markdown มา
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    
    return JSON.parse(cleanedText)
  } catch (error) {
    console.error('Error extracting slip data:', error)
    throw new Error('ไม่สามารถอ่านข้อมูลจากสลิปได้ โปรดลองอีกครั้ง')
  }
}
