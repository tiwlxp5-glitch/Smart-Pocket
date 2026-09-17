'use client'

import React from 'react'
import { Wallet, WalletType } from '@/types/database'
import { getWalletTypeLabel } from '@/utils/walletHelper'
import { Wallet as WalletIcon, CreditCard, Building2, Smartphone, Banknote, ShieldCheck } from 'lucide-react'

interface WalletCardProps {
  wallet: Wallet
  isSelected?: boolean
  onClick?: () => void
  showActions?: boolean
  onEdit?: (wallet: Wallet) => void
  compact?: boolean
}

export function WalletCard({
  wallet,
  isSelected = false,
  onClick,
  showActions = false,
  onEdit,
  compact = false,
}: WalletCardProps) {
  const balance = Number(wallet.balance) || 0
  const isNegative = balance < 0

  const getTypeIcon = (type: WalletType) => {
    switch (type) {
      case 'credit':
        return CreditCard
      case 'bank':
        return Building2
      case 'ewallet':
        return Smartphone
      case 'cash':
      default:
        return Banknote
    }
  }

  const Icon = getTypeIcon(wallet.type)

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
          isSelected
            ? 'border-blue-500 bg-blue-50/50 shadow-xs'
            : 'border-gray-100 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
            style={{ backgroundColor: wallet.color || '#10b981' }}
          >
            <Icon size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900 leading-tight">{wallet.name}</p>
            <p className="text-[10px] text-gray-500">{getWalletTypeLabel(wallet.type)}</p>
          </div>
        </div>
        <span
          className={`text-xs font-bold ${
            isNegative ? 'text-rose-600' : 'text-gray-900'
          }`}
        >
          ฿{balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl p-4 transition-all duration-200 cursor-pointer text-white shadow-md flex flex-col justify-between select-none ${
        isSelected ? 'ring-3 ring-blue-500 ring-offset-2 scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
      style={{
        background: `linear-gradient(135deg, ${wallet.color || '#10b981'}, ${adjustBrightness(wallet.color || '#10b981', -35)})`,
        minHeight: '140px',
      }}
    >
      {/* Subtle Pattern Circles */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none blur-xs" />
      <div className="absolute right-10 -top-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
            <Icon size={18} className="text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
              {getWalletTypeLabel(wallet.type)}
            </span>
          </div>
        </div>

        {wallet.is_default && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs">
            <ShieldCheck size={11} /> หลัก
          </span>
        )}
      </div>

      {/* Center/Bottom Info */}
      <div className="mt-3 relative z-10">
        <p className="text-xs text-white/80 font-medium truncate drop-shadow-xs">{wallet.name}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-light text-white/90">฿</span>
          <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">
            {balance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* Footer / Bank Code */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/15 text-[10px] text-white/75 relative z-10">
        <span>Smart Pocket Pay</span>
        {wallet.bank_name ? (
          <span className="uppercase font-bold tracking-wider">{wallet.bank_name}</span>
        ) : (
          <span className="capitalize">{wallet.type}</span>
        )}
      </div>
    </div>
  )
}

function adjustBrightness(hex: string, percent: number): string {
  if (!hex || !hex.startsWith('#')) return '#0f172a'
  let num = parseInt(hex.replace('#', ''), 16)
  if (isNaN(num)) return '#0f172a'

  let r = (num >> 16) + percent
  let g = ((num >> 8) & 0x00ff) + percent
  let b = (num & 0x0000ff) + percent

  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
