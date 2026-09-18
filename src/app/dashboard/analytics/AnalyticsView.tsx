'use client'

import { useState, useMemo } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
  getDay,
} from 'date-fns'
import { th } from 'date-fns/locale'
import { ExpenseDonutChart, CashflowBarChart } from './ChartComponents'

export type PeriodType = 'week' | 'month' | 'last_month' | 'year' | 'all'

export interface BucketRelation {
  id?: string
  name?: string
  color?: string | null
  icon?: string | null
}

export interface TransactionItem {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  note: string | null
  receiver: string | null
  transaction_date: string
  bucket_id: string | null
  buckets?: BucketRelation | BucketRelation[] | null
}

function getBucketObj(tx: TransactionItem): BucketRelation | null {
  if (Array.isArray(tx.buckets)) return tx.buckets[0] || null
  return tx.buckets || null
}

export interface BucketItem {
  id: string
  name: string
  color: string | null
  icon: string | null
  balance: number
}

export function AnalyticsView({
  initialTransactions,
  buckets,
}: {
  initialTransactions: TransactionItem[]
  buckets: BucketItem[]
}) {
  const [period, setPeriod] = useState<PeriodType>('month')

  // 1. Filter Transactions ตามช่วงเวลา
  const filteredTransactions = useMemo(() => {
    const now = new Date()

    if (period === 'all') {
      return initialTransactions
    }

    let interval: { start: Date; end: Date }

    if (period === 'week') {
      interval = {
        start: startOfWeek(now, { weekStartsOn: 1 }), // จันทร์
        end: endOfWeek(now, { weekStartsOn: 1 }), // อาทิตย์
      }
    } else if (period === 'month') {
      interval = {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
    } else if (period === 'last_month') {
      const lastMonth = subMonths(now, 1)
      interval = {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }
    } else {
      // 'year'
      interval = {
        start: startOfYear(now),
        end: endOfYear(now),
      }
    }

    return initialTransactions.filter((tx) => {
      try {
        const txDate = parseISO(tx.transaction_date)
        return isWithinInterval(txDate, interval)
      } catch {
        return false
      }
    })
  }, [initialTransactions, period])

  // 2. คำนวณภาพรวมรายรับ รายจ่าย และกระแสเงินสด
  const { totalIncome, totalExpense, netCashflow, savingsRate } = useMemo(() => {
    let income = 0
    let expense = 0

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0
      if (tx.type === 'income') {
        income += amt
      } else if (tx.type === 'expense') {
        expense += amt
      }
    })

    const net = income - expense
    const rate = income > 0 ? (net / income) * 100 : 0

    return {
      totalIncome: income,
      totalExpense: expense,
      netCashflow: net,
      savingsRate: rate,
    }
  }, [filteredTransactions])

  // 3. จัดกลุ่มสัดส่วนรายจ่ายตามกระเป๋าเงิน (Expense by Bucket)
  const bucketChartData = useMemo(() => {
    const bucketMap: Record<string, { name: string; value: number; color: string }> = {}

    // กำหนดสีเริ่มต้นจากรายชื่อ buckets ที่มี
    const bucketInfoMap = new Map<string, { name: string; color: string }>()
    buckets.forEach((b) => {
      bucketInfoMap.set(b.id, { name: b.name, color: b.color || '#3B82F6' })
    })

    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const amt = Number(tx.amount) || 0
        const bId = tx.bucket_id || 'general'
        const bInfo = tx.bucket_id ? bucketInfoMap.get(tx.bucket_id) : null
        const bObj = getBucketObj(tx)
        const name = bObj?.name || bInfo?.name || 'ค่าใช้จ่ายทั่วไป'
        const color = bObj?.color || bInfo?.color || '#94A3B8'

        if (!bucketMap[bId]) {
          bucketMap[bId] = { name, value: 0, color }
        }
        bucketMap[bId].value += amt
      })

    const list = Object.values(bucketMap)
    const sum = list.reduce((acc, curr) => acc + curr.value, 0)

    return list
      .map((item) => ({
        ...item,
        percentage: sum > 0 ? (item.value / sum) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions, buckets])

  // 4. ข้อมูลกราฟแท่ง (Cashflow Trend) ตามตัวกรอง
  const cashflowData = useMemo(() => {
    if (period === 'week') {
      // 7 วันในสัปดาห์ (จันทร์ - อาทิตย์)
      const days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
      const map: Record<number, { income: number; expense: number }> = {
        1: { income: 0, expense: 0 }, // Mon
        2: { income: 0, expense: 0 }, // Tue
        3: { income: 0, expense: 0 }, // Wed
        4: { income: 0, expense: 0 }, // Thu
        5: { income: 0, expense: 0 }, // Fri
        6: { income: 0, expense: 0 }, // Sat
        0: { income: 0, expense: 0 }, // Sun
      }

      filteredTransactions.forEach((tx) => {
        try {
          const d = parseISO(tx.transaction_date)
          const dayIndex = getDay(d) // 0=Sun, 1=Mon, ..., 6=Sat
          const amt = Number(tx.amount) || 0
          if (tx.type === 'income') map[dayIndex].income += amt
          else if (tx.type === 'expense') map[dayIndex].expense += amt
        } catch {}
      })

      // จัดเรียง จันทร์(1) -> อาทิตย์(0)
      const order = [1, 2, 3, 4, 5, 6, 0]
      return order.map((dayNum, i) => ({
        label: days[i],
        income: Math.round(map[dayNum].income),
        expense: Math.round(map[dayNum].expense),
      }))
    }

    if (period === 'month' || period === 'last_month') {
      // แบ่งเป็น 4-5 สัปดาห์ในเดือน
      const weeks = [
        { label: 'สัปดาห์ 1', income: 0, expense: 0 },
        { label: 'สัปดาห์ 2', income: 0, expense: 0 },
        { label: 'สัปดาห์ 3', income: 0, expense: 0 },
        { label: 'สัปดาห์ 4', income: 0, expense: 0 },
        { label: 'สัปดาห์ 5', income: 0, expense: 0 },
      ]

      filteredTransactions.forEach((tx) => {
        try {
          const d = parseISO(tx.transaction_date)
          const dayOfMonth = d.getDate()
          const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), 4)
          const amt = Number(tx.amount) || 0
          if (tx.type === 'income') weeks[weekIdx].income += amt
          else if (tx.type === 'expense') weeks[weekIdx].expense += amt
        } catch {}
      })

      return weeks.map((w) => ({
        label: w.label,
        income: Math.round(w.income),
        expense: Math.round(w.expense),
      }))
    }

    // ปีนี้ หรือ ทั้งหมด (แบ่ง 12 เดือน)
    const monthNames = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ]
    const months = monthNames.map((name) => ({ label: name, income: 0, expense: 0 }))

    filteredTransactions.forEach((tx) => {
      try {
        const d = parseISO(tx.transaction_date)
        const m = d.getMonth()
        const amt = Number(tx.amount) || 0
        if (tx.type === 'income') months[m].income += amt
        else if (tx.type === 'expense') months[m].expense += amt
      } catch {}
    })

    return months.map((m) => ({
      label: m.label,
      income: Math.round(m.income),
      expense: Math.round(m.expense),
    }))
  }, [filteredTransactions, period])

  // 5. รายการจ่ายสูงสุด 5 รายการ (Top 5 Spends)
  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
  }, [filteredTransactions])

  // ฟังก์ชันจัดข้อความและสีสถานะสุขภาพการเงิน
  const getHealthBadge = () => {
    if (totalIncome === 0 && totalExpense === 0) {
      return { text: 'ยังไม่มีข้อมูล', color: 'bg-gray-100 text-gray-600', icon: Calendar }
    }
    if (savingsRate >= 30) {
      return { text: 'ออมได้ดีเยี่ยม 🎉', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
    }
    if (savingsRate >= 10) {
      return { text: 'สถานะการเงินปกติ 👍', color: 'bg-blue-100 text-blue-700', icon: Sparkles }
    }
    if (savingsRate >= 0) {
      return { text: 'ควรระวังการใช้จ่าย ⚠️', color: 'bg-amber-100 text-amber-700', icon: AlertCircle }
    }
    return { text: 'รายจ่ายเกินรายรับ! 🚨', color: 'bg-rose-100 text-rose-700', icon: AlertCircle }
  }

  const health = getHealthBadge()
  const HealthIcon = health.icon

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Time Horizon Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'week', label: 'สัปดาห์นี้' },
          { id: 'month', label: 'เดือนนี้' },
          { id: 'last_month', label: 'เดือนที่แล้ว' },
          { id: 'year', label: 'ปีนี้' },
          { id: 'all', label: 'ทั้งหมด' },
        ].map((tab) => {
          const isActive = period === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as PeriodType)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 2. Overview Financial Summary Banner */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-5 text-white shadow-md">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-medium text-gray-300">กระแสเงินสดสุทธิ (คงเหลือ)</span>
          <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${health.color}`}>
            <HealthIcon size={12} />
            <span>{health.text}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <h2 className={`text-3xl font-black ${netCashflow >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {netCashflow >= 0 ? '+' : ''}฿{netCashflow.toLocaleString('th-TH')}
          </h2>
          {totalIncome > 0 && (
            <span className="text-xs text-gray-300">
              (ออมได้ {savingsRate.toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Breakdown Mini Bar */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDownCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">รายรับรวม</p>
              <p className="text-sm font-bold text-emerald-400">
                ฿{totalIncome.toLocaleString('th-TH')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">รายจ่ายรวม</p>
              <p className="text-sm font-bold text-rose-400">
                ฿{totalExpense.toLocaleString('th-TH')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bar Chart: แนวโน้มกระแสเงินสด */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-gray-900 text-sm">
            {period === 'week' ? 'เปรียบเทียบรายรับ-จ่าย รายวัน' : 'เปรียบเทียบรายรับ vs รายจ่าย'}
          </h3>
          <span className="text-[11px] text-gray-400 font-medium">หน่วย: บาท</span>
        </div>
        <CashflowBarChart data={cashflowData} />
      </div>

      {/* 4. Donut Chart: สัดส่วนรายจ่ายแยกตามกระเป๋า */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-bold text-gray-900 text-sm">สัดส่วนรายจ่ายตามกระเป๋าเงิน</h3>
          <span className="text-[11px] text-gray-400 font-medium">{bucketChartData.length} กระเป๋า</span>
        </div>
        <p className="text-xs text-gray-400 mb-2">ดูว่าเงินของคุณถูกใช้ไปกับกระเป๋าไหนมากที่สุด</p>
        <ExpenseDonutChart data={bucketChartData} totalExpense={totalExpense} />
      </div>

      {/* 5. Top 5 Largest Spends */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={18} className="text-rose-500" />
          <h3 className="font-bold text-gray-900 text-sm">รายการจ่ายสูงสุดในรอบนี้</h3>
        </div>

        {topExpenses.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            ไม่มีรายการรายจ่ายในช่วงเวลานี้
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {topExpenses.map((tx, idx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {tx.note || 'ไม่ระบุรายการ'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {tx.receiver && (
                        <span className="text-[10px] text-gray-500">ถึง: {tx.receiver}</span>
                      )}
                      {getBucketObj(tx)?.name && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                          {getBucketObj(tx)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-gray-900">
                    -฿{Number(tx.amount).toLocaleString('th-TH')}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {format(parseISO(tx.transaction_date), 'd MMM', { locale: th })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
