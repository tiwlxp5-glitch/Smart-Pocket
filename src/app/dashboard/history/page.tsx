'use client'

import { ScrollText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

// ข้อมูลจำลอง (Mock Data)
const mockHistory = [
  { id: '1', type: 'expense', amount: 150, note: 'ค่ากาแฟ', date: 'วันนี้, 09:30', bucket: 'เงินใช้ชีวิต' },
  { id: '2', type: 'income', amount: 30000, note: 'เงินเดือน', date: 'เมื่อวาน, 10:00', bucket: 'จัดสรรแล้ว' },
  { id: '3', type: 'expense', amount: 1200, note: 'ซื้อกองทุนรวม', date: '2 วันที่แล้ว', bucket: 'เงินลงทุน' },
]

export default function HistoryPage() {
  return (
    <main className="p-6 pb-24 min-h-screen bg-gray-50">
      <header className="flex items-center gap-2 mb-8">
        <ScrollText size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">ประวัติการเงิน</h1>
      </header>

      <div className="flex flex-col gap-4">
        {mockHistory.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {item.type === 'income' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.note}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{item.date}</span>
                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {item.bucket}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className={`font-bold text-lg ${
                item.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
              }`}>
                {item.type === 'income' ? '+' : '-'}฿{item.amount.toLocaleString('th-TH')}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400">สิ้นสุดรายการย้อนหลัง (Demo)</p>
      </div>
    </main>
  )
}
