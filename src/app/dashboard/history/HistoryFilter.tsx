'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
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

  const currentType = searchParams.get('type') || 'all'
  const currentWallet = searchParams.get('wallet_id') || 'all'

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete(name)
      } else {
        params.set(name, value)
      }
      return params.toString()
    },
    [searchParams]
  )

  return (
    <div className="flex flex-col gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* 1. ประเภทรายการ (Main Category) */}
      <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
        <Link
          href={`${pathname}?${createQueryString('type', 'all')}`}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            currentType === 'all' 
              ? 'bg-gray-100 text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          ทั้งหมด
        </Link>
        <Link
          href={`${pathname}?${createQueryString('type', 'income')}`}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            currentType === 'income' 
              ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          รายรับ
        </Link>
        <Link
          href={`${pathname}?${createQueryString('type', 'expense')}`}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg text-center transition-all active:scale-[0.98] ${
            currentType === 'expense' 
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
            href={`${pathname}?${createQueryString('wallet_id', 'all')}`}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all active:scale-[0.95] ${
              currentWallet === 'all' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            ทุกบัญชี
          </Link>
          
          {wallets.map(w => (
            <Link
              key={w.id}
              href={`${pathname}?${createQueryString('wallet_id', w.id)}`}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all active:scale-[0.95] shadow-2xs ${
                currentWallet === w.id 
                  ? 'border-transparent text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={
                currentWallet === w.id 
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
