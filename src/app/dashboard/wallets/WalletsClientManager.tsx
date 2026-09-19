'use client'

import React, { useState } from 'react'
import { Wallet, WalletType, Bucket } from '@/types/database'
import { BankPreset, getWalletTypeLabel } from '@/utils/walletHelper'
import { WalletCard } from '@/components/WalletCard'
import { createWallet, updateWallet, deleteWallet } from '@/app/dashboard/actions'
import { Plus, Edit2, Archive, X, Check, Building2, Banknote, Smartphone, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  initialWallets: Wallet[]
  archivedWallets: Wallet[]
  bankPresets: BankPreset[]
  initialBuckets: Bucket[]
}

export function WalletsClientManager({
  initialWallets,
  archivedWallets,
  bankPresets,
  initialBuckets,
}: Props) {
  const [filterType, setFilterType] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form states for Create
  const [selectedPreset, setSelectedPreset] = useState<BankPreset | null>(bankPresets[0])
  const [name, setName] = useState(bankPresets[0].name)
  const [type, setType] = useState<WalletType>(bankPresets[0].type)
  const [color, setColor] = useState(bankPresets[0].color)
  const [bankName, setBankName] = useState(bankPresets[0].code)
  const [openingBalance, setOpeningBalance] = useState('')
  const [cashBalance, setCashBalance] = useState('')
  const [allocationPercentage, setAllocationPercentage] = useState('0')
  const [monthlyBudget, setMonthlyBudget] = useState('')

  // Edit form states
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editAllocation, setEditAllocation] = useState('0')
  const [editBudget, setEditBudget] = useState('')

  const handleSelectPreset = (preset: BankPreset) => {
    setSelectedPreset(preset)
    setName(preset.name)
    setType(preset.type)
    setColor(preset.color)
    setBankName(preset.code)
  }

  const handleOpenCreate = () => {
    handleSelectPreset(bankPresets[0])
    setOpeningBalance('')
    setCashBalance('')
    setAllocationPercentage('0')
    setMonthlyBudget('')
    setErrorMessage(null)
    setIsCreateModalOpen(true)
  }

  const handleOpenEdit = (w: Wallet) => {
    setEditingWallet(w)
    setEditName(w.name)
    setEditColor(w.color || '#10b981')
    const linkedBucket = initialBuckets.find(b => b.default_wallet_id === w.id)
    if (linkedBucket) {
      setEditAllocation(String(linkedBucket.allocation_percentage || 0))
      setEditBudget(linkedBucket.monthly_budget ? String(linkedBucket.monthly_budget) : '')
    } else {
      setEditAllocation('0')
      setEditBudget('')
    }
    setErrorMessage(null)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('type', type)
      formData.append('bank_name', bankName)
      formData.append('color', color)
      formData.append('opening_balance', openingBalance || '0')
      formData.append('cash_balance', cashBalance || '0')
      formData.append('allocation_percentage', allocationPercentage)
      if (monthlyBudget) formData.append('monthly_budget', monthlyBudget)

      const res = await createWallet(formData)
      if (res?.success) {
        setIsCreateModalOpen(false)
      } else {
        setErrorMessage(res?.message || 'เกิดข้อผิดพลาดในการสร้างกระเป๋าเงิน')
      }
    } catch (err) {
      console.error('Failed to create wallet:', err)
      setErrorMessage('เกิดข้อผิดพลาดในการสร้างกระเป๋าเงิน')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWallet) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append('wallet_id', editingWallet.id)
      formData.append('name', editName)
      formData.append('color', editColor)
      formData.append('allocation_percentage', editAllocation)
      if (editBudget) formData.append('monthly_budget', editBudget)

      const res = await updateWallet(formData)
      if (res?.success) {
        setEditingWallet(null)
      } else {
        setErrorMessage(res?.message || 'เกิดข้อผิดพลาดในการแก้ไขกระเป๋าเงิน')
      }
    } catch (err) {
      console.error('Failed to update wallet:', err)
      setErrorMessage('เกิดข้อผิดพลาดในการแก้ไขกระเป๋าเงิน')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (walletId: string, walletName: string) => {
    if (!confirm(`คุณต้องการลบ/ซ่อนกระเป๋า "${walletName}" ใช่หรือไม่?\n(หากมีประวัติรายการ จะต้องโอนเงินออกให้เป็น 0 บาทก่อน)`)) {
      return
    }
    setDeletingWalletId(walletId)
    try {
      const res = await deleteWallet(walletId)
      if (!res?.success) {
        toast.error(res?.message || 'เกิดข้อผิดพลาดในการลบกระเป๋า')
      }
    } finally {
      setDeletingWalletId(null)
    }
  }

  const filteredWallets = initialWallets.filter((w) => {
    if (filterType === 'all') return true
    return w.type === filterType
  })

  const { groupedWallets, independentWallets } = React.useMemo(() => {
    const groups: Record<string, Wallet[]> = {}
    const independents: Wallet[] = []

    const tempGroups: Record<string, Wallet[]> = {}
    filteredWallets.forEach(w => {
      const bn = w.bank_name
      if (bn && bn !== 'cash' && bn !== 'credit_general' && bn !== 'none') {
        if (!tempGroups[bn]) tempGroups[bn] = []
        tempGroups[bn].push(w)
      } else {
        independents.push(w)
      }
    })

    Object.entries(tempGroups).forEach(([bn, wallets]) => {
      if (wallets.length > 1) {
        groups[bn] = wallets
      } else {
        independents.push(wallets[0])
      }
    })

    return { groupedWallets: groups, independentWallets: independents }
  }, [filteredWallets])

  const renderWalletCard = (wallet: Wallet) => (
    <div key={wallet.id} className="relative group">
      <WalletCard wallet={wallet} />
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleOpenEdit(wallet)}
          className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition shadow-2xs"
          title="แก้ไขกระเป๋า"
        >
          <Edit2 size={13} />
        </button>
        {!wallet.is_default && (
          <button
            onClick={() => handleDelete(wallet.id, wallet.name)}
            disabled={deletingWalletId === wallet.id}
            className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="ลบ/ซ่อนกระเป๋า"
          >
            {deletingWalletId === wallet.id ? (
              <Loader2 size={13} className="animate-spin text-white" />
            ) : (
              <Archive size={13} />
            )}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Category Tabs & Add Button */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            ทั้งหมด ({initialWallets.length})
          </button>
          <button
            onClick={() => setFilterType('bank')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'bank'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            ธนาคาร
          </button>
          <button
            onClick={() => setFilterType('cash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'cash'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            เงินสด
          </button>
          <button
            onClick={() => setFilterType('ewallet')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'ewallet'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            E-Wallet
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'credit'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            บัตรเครดิต
          </button>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition"
        >
          <Plus size={14} /> เพิ่มกระเป๋า
        </button>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {Object.entries(groupedWallets).map(([bankCode, groupWallets]) => {
          const bankPreset = bankPresets.find(p => p.code === bankCode)
          const bankName = bankPreset ? bankPreset.name.split(' (')[0] : bankCode
          const totalGroupBalance = groupWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0)
          
          return (
            <div key={bankCode} className="rounded-[24px] border border-gray-200 bg-gray-50/70 p-2.5 shadow-sm">
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-gray-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: bankPreset?.color || '#94a3b8' }} />
                  <span className="text-sm font-black text-gray-800">{bankName}</span>
                </div>
                <div className="text-right flex items-baseline gap-1.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total</span>
                  <span className="text-sm font-black text-gray-900">
                    ฿{totalGroupBalance.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {groupWallets.map(wallet => renderWalletCard(wallet))}
              </div>
            </div>
          )
        })}

        {independentWallets.map((wallet) => renderWalletCard(wallet))}

        {filteredWallets.length === 0 && (
          <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-3xl">
            <p className="text-sm text-gray-500">ไม่พบกระเป๋าในหมวดหมู่นี้</p>
            <button
              onClick={handleOpenCreate}
              className="mt-3 text-xs text-blue-600 font-bold hover:underline"
            >
              + เพิ่มกระเป๋าใหม่
            </button>
          </div>
        )}
      </div>

      {/* Modal: Create Wallet */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">เพิ่มกระเป๋า / บัญชีใหม่</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mt-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-3">
              {/* Presets Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  เลือกธนาคาร / บัญชียอดนิยม
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  {bankPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition truncate flex items-center gap-1.5 ${
                        selectedPreset?.id === preset.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-2xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="truncate">{preset.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallet Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อกระเป๋า / บัญชี <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น กสิกรเงินเดือน, เงินสดติดตัว"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Wallet Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ประเภทบัญชี</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bank', 'cash', 'ewallet', 'credit'] as WalletType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition text-center ${
                        type === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {getWalletTypeLabel(t)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">สีประจำกระเป๋า</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs uppercase font-mono"
                  />
                </div>
                {/* Palette */}
                <div className="flex flex-wrap gap-2">
                  {['#138f2d', '#4e2a84', '#1e3a8a', '#00a5e5', '#eb1985', '#ffbe00', '#ff8200', '#002d63', '#10b981', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 shadow-xs transition-transform hover:scale-110 ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Opening Balance */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ยอดเงินในบัญชี (เงินโอน)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 font-bold">฿</span>
                  <input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00 (ใส่ยอดเงินในบัญชีปัจจุบันที่มี)"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cash Balance */}
              {type === 'bank' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ยอดเงินสดติดตัว (ของบัญชีนี้)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm text-gray-400 font-bold">฿</span>
                    <input
                      type="number"
                      step="any"
                      value={cashBalance}
                      onChange={(e) => setCashBalance(e.target.value)}
                      placeholder="0.00 (ใส่ยอดเงินสดที่มี, ปล่อยว่างได้)"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Allocation Percentage & Monthly Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เป้าหมายแบ่งเงิน (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={allocationPercentage}
                      onChange={(e) => setAllocationPercentage(e.target.value)}
                      placeholder="0"
                      className="w-full pr-8 pl-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-sm text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เพดานงบรายเดือน (฿)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      placeholder="ไม่จำกัด"
                      className="w-full pl-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    'สร้างกระเป๋า'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Wallet */}
      {editingWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">แก้ไขกระเป๋าเงิน</h3>
              <button
                onClick={() => setEditingWallet(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mt-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อกระเป๋า / บัญชี
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">สีประจำกระเป๋า</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs uppercase font-mono"
                  />
                </div>
                {/* Palette */}
                <div className="flex flex-wrap gap-2">
                  {['#138f2d', '#4e2a84', '#1e3a8a', '#00a5e5', '#eb1985', '#ffbe00', '#ff8200', '#002d63', '#10b981', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-6 h-6 rounded-full border-2 shadow-xs transition-transform hover:scale-110 ${editColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Allocation Percentage & Monthly Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เป้าหมายแบ่งเงิน (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={editAllocation}
                      onChange={(e) => setEditAllocation(e.target.value)}
                      placeholder="0"
                      className="w-full pr-8 pl-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-sm text-gray-400 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">เพดานงบรายเดือน (฿)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      placeholder="ไม่จำกัด"
                      className="w-full pl-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    'บันทึกการแก้ไข'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
