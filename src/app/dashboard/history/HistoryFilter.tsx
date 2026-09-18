'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState, useEffect } from 'react'
import { Filter } from 'lucide-react'
import Link from 'next/link'

interface Wallet {
  id: string
  name: string
  color: string
}

export function HistoryFilter({ wallets }: { wallets: Wallet[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [pendingType, setPendingType] = useState<string | null>(null)
  const [pendingWallet, setPendingWallet] = useState<string | null>(null)

  useEffect(() => {
    setPendingType(null)
    setPendingWallet(null)
  }, [searchParams])

  const activeType = pendingType ?? (searchParams.get('type') || 'all')
  const activeWallet = pendingWallet ?? (searchParams.get('wallet_id') || 'all')

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      const qs = params.toString()
      return qs ? `?${qs}` : ''
    },
    [searchParams]
  )

  return (
    <div className="flex flex-col gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* 1. ประเภทรายการ (Main Category) */}
      <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
        <Link
          href={`${pathname}${createQueryString('type', 'all')}`}
          onClick={() => { if (activeType !== 'all') setPendingType('all') }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            activeType === 'all' 
              ? 'bg-gray-100 text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </Link>
        <Link
          href={`${pathname}${createQueryString('type', 'income')}`}
          onClick={() => { if (activeType !== 'income') setPendingType('income') }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            activeType === 'income' 
              ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          รายรับ
        </Link>
        <Link
          href={`${pathname}${createQueryString('type', 'expense')}`}
          onClick={() => { if (activeType !== 'expense') setPendingType('expense') }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            activeType === 'expense' 
              ? 'bg-rose-50 text-rose-700 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          รายจ่าย
        </Link>
      </div>

      {/* 2. บัญชี/ธนาคาร (Sub Category) */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-400 shrink-0" />
        <div className="flex overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 gap-2 flex-nowrap w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Link
            href={`${pathname}${createQueryString('wallet_id', 'all')}`}
            onClick={() => { if (activeWallet !== 'all') setPendingWallet('all') }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all active:scale-[0.95] ${
              activeWallet === 'all' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ทุกบัญชี
          </Link>
          
          {wallets.map(w => (
            <Link
              key={w.id}
              href={`${pathname}${createQueryString('wallet_id', w.id)}`}
              onClick={() => { if (activeWallet !== w.id) setPendingWallet(w.id) }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all active:scale-[0.95] shadow-2xs ${
                activeWallet === w.id 
                  ? 'border-transparent text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={
                activeWallet === w.id 
                  ? { backgroundColor: w.color || '#10b981' } 
                  : {}
              }
            >
              {w.name}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
