'use client'

import { useState } from 'react'
import { Download, X, FileSpreadsheet, Calendar, Check, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export interface ExportTransactionItem {
  id: string
  type: string
  amount: number
  note: string | null
  receiver: string | null
  transaction_date: string
  buckets?: { name?: string } | { name?: string }[] | null
}

interface ExportModalProps {
  transactions: ExportTransactionItem[]
}

type TimeframeOption = 'this_month' | 'this_year' | 'all'

export function ExportModal({ transactions }: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('this_month')
  const [isExporting, setIsExporting] = useState(false)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Filter transactions based on selected timeframe
  const filteredData = transactions.filter((tx) => {
    const txDate = new Date(tx.transaction_date)
    if (timeframe === 'this_month') {
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth
    }
    if (timeframe === 'this_year') {
      return txDate.getFullYear() === currentYear
    }
    return true // 'all'
  })

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const handleDownload = () => {
    setIsExporting(true)
    try {
      // 1. Header row
      const headers = [
        'วันที่',
        'เวลา',
        'ประเภท',
        'จำนวนเงิน (บาท)',
        'กระเป๋าเงิน/หมวดหมู่',
        'บันทึก/หมายเหตุ',
        'ผู้รับเงิน/ร้านค้า'
      ]
      let csvString = headers.map(h => escapeCSV(h)).join(',') + '\r\n'

      // 2. Data rows
      filteredData.forEach((tx) => {
        const txDate = new Date(tx.transaction_date)
        const dateStr = format(txDate, 'yyyy-MM-dd')
        const timeStr = format(txDate, 'HH:mm:ss')
        const typeStr = tx.type === 'income' ? 'รายรับ' : tx.type === 'expense' ? 'รายจ่าย' : 'โอนเงิน'
        const amountStr = Number(tx.amount).toFixed(2)
        
        let bucketName = '-'
        if (Array.isArray(tx.buckets) && tx.buckets.length > 0) {
          bucketName = tx.buckets[0]?.name || '-'
        } else if (tx.buckets && typeof tx.buckets === 'object' && 'name' in tx.buckets) {
          bucketName = (tx.buckets as { name?: string }).name || '-'
        }

        const noteStr = tx.note || ''
        const receiverStr = tx.receiver || ''

        const row = [
          escapeCSV(dateStr),
          escapeCSV(timeStr),
          escapeCSV(typeStr),
          escapeCSV(amountStr),
          escapeCSV(bucketName),
          escapeCSV(noteStr),
          escapeCSV(receiverStr),
        ]
        csvString += row.join(',') + '\r\n'
      })

      // 3. Add UTF-8 BOM (\uFEFF) to guarantee proper Thai rendering in MS Excel
      const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const fileSuffix = timeframe === 'this_month' 
        ? format(now, 'yyyy-MM') 
        : timeframe === 'this_year' 
        ? `${currentYear}` 
        : 'all'

      link.href = url
      link.setAttribute('download', `smart_pocket_transactions_${fileSuffix}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsOpen(false)
    } catch (err) {
      console.error('Export Error:', err)
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition shadow-2xs"
        title="ส่งออกประวัติเป็นไฟล์ CSV/Excel"
      >
        <Download size={15} />
        <span>ส่งออกข้อมูล</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">ส่งออกข้อมูลธุรกรรม</h3>
                  <p className="text-xs text-gray-500">ไฟล์ CSV สำหรับ Excel / Sheets</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Timeframe selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <Calendar size={14} />
                <span>เลือกระยะเวลาที่ต้องการส่งออก:</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTimeframe('this_month')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition text-center ${
                    timeframe === 'this_month'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  เดือนนี้
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('this_year')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition text-center ${
                    timeframe === 'this_year'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ปีนี้
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('all')}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition text-center ${
                    timeframe === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 flex flex-col gap-1 text-xs text-emerald-900">
              <div className="flex items-center justify-between font-bold">
                <span>จำนวนรายการที่จะส่งออก:</span>
                <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  {filteredData.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                ✓ เข้ารหัสแบบ UTF-8 BOM รองรับภาษาไทยใน Microsoft Excel สมบูรณ์ 100%
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isExporting || filteredData.length === 0}
                onClick={handleDownload}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>ดาวน์โหลด CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
