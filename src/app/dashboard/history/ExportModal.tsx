'use client'

import { useState } from 'react'
import { Download, X, FileSpreadsheet, Calendar, Check, Loader2, Sparkles, FileText } from 'lucide-react'
import { format } from 'date-fns'

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
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)

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

  // Calculate summary
  let incomeSum = 0
  let expenseSum = 0
  filteredData.forEach((tx) => {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income') incomeSum += amt
    else if (tx.type === 'expense') expenseSum += amt
  })
  const netSum = incomeSum - expenseSum

  // 1. Download Styled Excel (.xlsx)
  const handleDownloadExcel = async () => {
    setIsExportingExcel(true)
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe, items: filteredData })
      })

      if (!res.ok) {
        throw new Error('Server error exporting Excel')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      const fileSuffix = timeframe === 'this_month'
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        : timeframe === 'this_year'
        ? `${currentYear}`
        : 'all'

      link.href = url
      link.setAttribute('download', `smart_pocket_report_${fileSuffix}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setIsOpen(false)
    } catch (err) {
      console.error('Export Excel Error:', err)
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExportingExcel(false)
    }
  }

  // 2. Download CSV (.csv)
  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const handleDownloadCSV = () => {
    setIsExportingCSV(true)
    try {
      const headers = [
        'ลำดับ',
        'วันที่',
        'เวลา',
        'ประเภท',
        'จำนวนเงิน (บาท)',
        'กระเป๋าเงิน/หมวดหมู่',
        'บันทึก/หมายเหตุ',
        'ผู้รับเงิน/ร้านค้า'
      ]
      let csvString = headers.map(h => escapeCSV(h)).join(',') + '\r\n'

      filteredData.forEach((tx, idx) => {
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
          escapeCSV(idx + 1),
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

      // Add UTF-8 BOM (\uFEFF)
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
      console.error('Export CSV Error:', err)
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV')
    } finally {
      setIsExportingCSV(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-3 py-1.5 rounded-full transition shadow-2xs whitespace-nowrap shrink-0"
        title="ส่งออกรายงานเป็นไฟล์ Excel หรือ CSV"
      >
        <FileSpreadsheet size={15} />
        <span>ส่งออก Excel / CSV</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">ส่งออกรายงานการเงิน</h3>
                  <p className="text-xs text-gray-500">รายงานระดับมืออาชีพ พร้อมเปิดใน Excel ทันที</p>
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
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-500" />
                <span>เลือกรอบระยะเวลา:</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTimeframe('this_month')}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition text-center ${
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
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition text-center ${
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
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition text-center ${
                    timeframe === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ทั้งหมด
                </button>
              </div>
            </div>

            {/* Financial Summary Preview */}
            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-gray-600 font-semibold">
                <span>สรุปข้อมูลที่จะส่งออก:</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                  {filteredData.length} รายการ
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-white p-2 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">รายรับ</p>
                  <p className="text-xs font-bold text-emerald-600 truncate">+฿{incomeSum.toLocaleString()}</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">รายจ่าย</p>
                  <p className="text-xs font-bold text-rose-600 truncate">-฿{expenseSum.toLocaleString()}</p>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400">สุทธิ</p>
                  <p className={`text-xs font-bold truncate ${netSum >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                    ฿{netSum.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              {/* Option 1: Styled Excel (.xlsx) */}
              <button
                type="button"
                disabled={isExportingExcel || isExportingCSV || filteredData.length === 0}
                onClick={handleDownloadExcel}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-between disabled:opacity-50 group"
              >
                <div className="flex items-center gap-2.5">
                  {isExportingExcel ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={20} />
                  )}
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span>ดาวน์โหลด Excel (.xlsx)</span>
                      <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-md font-semibold">แนะนำ</span>
                    </div>
                    <p className="text-[10px] text-emerald-100 font-normal">
                      จัดตารางสวย มีสรุปยอดบนหัวตาราง แก้ไขปัญหา ###### 100%
                    </p>
                  </div>
                </div>
                <Download size={18} className="opacity-80 group-hover:translate-y-0.5 transition" />
              </button>

              {/* Option 2: Plain CSV (.csv) */}
              <button
                type="button"
                disabled={isExportingExcel || isExportingCSV || filteredData.length === 0}
                onClick={handleDownloadCSV}
                className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-semibold transition flex items-center justify-between disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  {isExportingCSV ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} className="text-gray-400" />}
                  <span>ดาวน์โหลดไฟล์ข้อมูลดิบ CSV (.csv)</span>
                </div>
                <Download size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
