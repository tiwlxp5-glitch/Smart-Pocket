'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from '@/types/database'
import { getWalletTypeLabel, validateTransfer } from '@/utils/walletHelper'
import { transferMoney } from '@/app/dashboard/actions'
import { ArrowUpDown, ArrowRight, ArrowRightLeft, Sparkles, CheckCircle2 } from 'lucide-react'

interface Props {
  wallets: Wallet[]
}

export function TransferFormClient({ wallets }: Props) {
  const router = useRouter()
  const [fromWalletId, setFromWalletId] = useState<string>(wallets[0]?.id || '')
  const [toWalletId, setToWalletId] = useState<string>(
    wallets.find((w) => w.id !== wallets[0]?.id)?.id || ''
  )
  const [amount, setAmount] = useState<string>('')
  const [fee, setFee] = useState<string>('')
  const [hasFee, setHasFee] = useState(false)
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const fromWallet = wallets.find((w) => w.id === fromWalletId) || null
  const toWallet = wallets.find((w) => w.id === toWalletId) || null

  const handleSwap = () => {
    const temp = fromWalletId
    setFromWalletId(toWalletId)
    setToWalletId(temp)
  }

  const numAmount = Number(amount) || 0
  const numFee = hasFee ? Number(fee) || 0 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const val = validateTransfer(fromWallet, toWallet, numAmount, numFee)
    if (!val.valid) {
      setErrorMsg(val.error || 'ข้อมูลไม่ถูกต้อง')
      return
    }

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('from_wallet_id', fromWalletId)
    formData.append('to_wallet_id', toWalletId)
    formData.append('amount', String(numAmount))
    formData.append('transfer_fee', String(numFee))
    formData.append('note', note)
    formData.append('date', new Date().toISOString())

    const res = await transferMoney(formData)
    setIsSubmitting(false)

    if (res?.success) {
      setIsSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1200)
    } else {
      setErrorMsg(res?.message || 'เกิดข้อผิดพลาดในการโอนเงิน')
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-emerald-100 shadow-md">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-1">โอนเงินสำเร็จเรียบร้อย!</h3>
        <p className="text-xs text-gray-500 mb-4">
          ยอดเงินถูกย้ายจาก {fromWallet?.name} ไปยัง {toWallet?.name} แล้ว
        </p>
        <div className="text-xs text-gray-400">กำลังพากลับหน้าหลัก...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl shadow-2xs">
          {errorMsg}
        </div>
      )}

      {/* From & To Wallets Container */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs relative">
        {/* From Wallet */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            กระเป๋าต้นทาง (โอนออกจาก)
          </label>
          <select
            value={fromWalletId}
            onChange={(e) => setFromWalletId(e.target.value)}
            className="w-full p-3 rounded-2xl border border-gray-200 text-sm font-semibold bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id} disabled={w.id === toWalletId}>
                {w.name} ({getWalletTypeLabel(w.type)}) — คงเหลือ ฿
                {Number(w.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button Divider */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <button
            type="button"
            onClick={handleSwap}
            className="relative z-10 w-9 h-9 rounded-full bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center shadow-xs transition hover:scale-105 active:scale-95"
            title="สลับต้นทาง-ปลายทาง"
          >
            <ArrowUpDown size={15} />
          </button>
        </div>

        {/* To Wallet */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            กระเป๋าปลายทาง (รับเงินเข้า)
          </label>
          <select
            value={toWalletId}
            onChange={(e) => setToWalletId(e.target.value)}
            className="w-full p-3 rounded-2xl border border-gray-200 text-sm font-semibold bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id} disabled={w.id === fromWalletId}>
                {w.name} ({getWalletTypeLabel(w.type)}) — คงเหลือ ฿
                {Number(w.balance).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount Card */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
        <label className="block text-xs font-bold text-gray-700 mb-2">จำนวนเงินที่ต้องการโอน</label>
        <div className="relative mb-3">
          <span className="absolute left-4 top-3 text-2xl font-black text-gray-400">฿</span>
          <input
            type="number"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-11 pr-4 py-3 text-3xl font-black text-gray-900 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-tight"
          />
        </div>

        {/* Quick Amount Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[100, 500, 1000, 5000].map((quickAmt) => (
            <button
              key={quickAmt}
              type="button"
              onClick={() => setAmount(String((Number(amount) || 0) + quickAmt))}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition whitespace-nowrap"
            >
              +{quickAmt.toLocaleString()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAmount('')}
            className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-400 hover:bg-gray-50 transition"
          >
            ล้าง
          </button>
        </div>
      </div>

      {/* Transfer Fee Toggle & Input */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-900">มีค่าธรรมเนียมการโอน?</p>
            <p className="text-[10px] text-gray-400">หักเพิ่มจากกระเป๋าต้นทางเป็นค่าใช้จ่าย</p>
          </div>
          <button
            type="button"
            onClick={() => setHasFee(!hasFee)}
            className={`w-11 h-6 rounded-full p-1 transition duration-200 ease-in-out ${
              hasFee ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition duration-200 ease-in-out ${
                hasFee ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {hasFee && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              ค่าธรรมเนียม (บาท)
            </label>
            <input
              type="number"
              step="any"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Note */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs">
        <label className="block text-xs font-bold text-gray-700 mb-1.5">
          บันทึกย่อ (Note) <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ถอนเงินสดใช้ประจำสัปดาห์, เติมเงินเข้าเป๋าตัง"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Live Preview Summary */}
      {fromWallet && toWallet && numAmount > 0 && (
        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-3xl text-xs space-y-2">
          <div className="flex items-center justify-between text-blue-900 font-bold">
            <span>สรุปผลการโอน</span>
            <span>ยอดโอน ฿{numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600 pt-1 border-t border-blue-200/50">
            <span>{fromWallet.name}:</span>
            <span className="font-semibold text-rose-600">
              ฿{Number(fromWallet.balance).toLocaleString()} ➔ ฿
              {(Number(fromWallet.balance) - (numAmount + numFee)).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>{toWallet.name}:</span>
            <span className="font-semibold text-emerald-600">
              ฿{Number(toWallet.balance).toLocaleString()} ➔ ฿
              {(Number(toWallet.balance) + numAmount).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          {hasFee && numFee > 0 && (
            <p className="text-[10px] text-blue-700 italic">
              * รวมค่าธรรมเนียม ฿{numFee} จะตัดจาก {fromWallet.name} รวมทั้งสิ้น ฿
              {(numAmount + numFee).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || numAmount <= 0}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-md transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
      >
        <ArrowRightLeft size={16} />
        {isSubmitting ? 'กำลังดำเนินการโอน...' : 'ยืนยันการโอนเงิน'}
      </button>
    </form>
  )
}
