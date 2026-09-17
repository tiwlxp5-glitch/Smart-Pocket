'use client'

import { useSyncExternalStore } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface BucketData {
  name: string
  value: number
  color: string
  percentage: number
}

interface CashflowPoint {
  label: string
  income: number
  expense: number
}

const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

// -------------------------------------------------------------
// 1. Donut Chart: สัดส่วนรายจ่ายแยกตามกระเป๋าเงิน
// -------------------------------------------------------------
export function ExpenseDonutChart({
  data,
  totalExpense,
}: {
  data: BucketData[]
  totalExpense: number
}) {
  const mounted = useIsMounted()

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        กำลังโหลดกราฟ...
      </div>
    )
  }

  if (!data || data.length === 0 || totalExpense <= 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
        <div className="w-16 h-16 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
          ฿
        </div>
        <p>ยังไม่มีข้อมูลรายจ่ายในช่วงเวลานี้</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as BucketData
                  return (
                    <div className="bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-xs shadow-lg border border-gray-800">
                      <p className="font-semibold text-gray-200">{item.name}</p>
                      <p className="text-sm font-bold text-white mt-0.5">
                        ฿{item.value.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        สัดส่วน {item.percentage.toFixed(1)}% ของรายจ่าย
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* ยอดเงินตรงกลาง Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-400 font-medium">จ่ายรวม</span>
          <span className="text-lg font-black text-gray-900">
            ฿{Math.round(totalExpense).toLocaleString('th-TH')}
          </span>
        </div>
      </div>

      {/* Legend รายการกระเป๋า */}
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-gray-700 font-medium">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                ฿{item.value.toLocaleString('th-TH')}
              </span>
              <span className="text-gray-400 font-mono text-[11px] w-12 text-right">
                ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// -------------------------------------------------------------
// 2. Bar Chart: เปรียบเทียบกระแสเงินสด รายรับ vs รายจ่าย
// -------------------------------------------------------------
export function CashflowBarChart({ data }: { data: CashflowPoint[] }) {
  const mounted = useIsMounted()

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        กำลังโหลดกราฟ...
      </div>
    )
  }

  const hasAnyData = data.some((d) => d.income > 0 || d.expense > 0)
  if (!hasAnyData) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
        <p>ยังไม่มีข้อมูลการเงินในช่วงเวลานี้</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#6B7280' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const inc = Number(payload.find((p) => p.dataKey === 'income')?.value || 0)
                  const exp = Number(payload.find((p) => p.dataKey === 'expense')?.value || 0)
                  const net = inc - exp
                  return (
                    <div className="bg-gray-900/90 backdrop-blur-sm text-white px-3 py-2.5 rounded-xl text-xs shadow-lg border border-gray-800 min-w-[140px]">
                      <p className="font-semibold text-gray-300 border-b border-gray-700/60 pb-1 mb-1.5">
                        {label}
                      </p>
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-emerald-400">รายรับ:</span>
                        <span className="font-bold text-white">฿{inc.toLocaleString('th-TH')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 mt-1">
                        <span className="text-rose-400">รายจ่าย:</span>
                        <span className="font-bold text-white">฿{exp.toLocaleString('th-TH')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-3 mt-1 pt-1 border-t border-gray-700/60">
                        <span className="text-gray-300">สุทธิ:</span>
                        <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {net >= 0 ? '+' : ''}฿{net.toLocaleString('th-TH')}
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="income"
              name="รายรับ"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="expense"
              name="รายจ่าย"
              fill="#F43F5E"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="flex justify-center items-center gap-6 mt-2 pt-2 border-t border-gray-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-gray-600 font-medium">รายรับ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-gray-600 font-medium">รายจ่าย</span>
        </div>
      </div>
    </div>
  )
}
