'use client'

import { Archive } from 'lucide-react'
import { deleteWallet } from '@/app/dashboard/actions'

export function DashboardWalletDeleteButton({ walletId, walletName }: { walletId: string, walletName: string }) {
  const handleDelete = async () => {
    if (!confirm(`คุณต้องการลบ/ซ่อนกระเป๋า "${walletName}" ใช่หรือไม่?\n(หากมีประวัติรายการ จะต้องโอนเงินออกให้เป็น 0 บาทก่อน)`)) {
      return
    }
    const res = await deleteWallet(walletId)
    if (!res?.success) {
      alert(res?.message || 'เกิดข้อผิดพลาดในการลบกระเป๋า')
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white backdrop-blur-md transition shadow-2xs z-20"
      title="ลบ/ซ่อนกระเป๋า"
    >
      <Archive size={13} />
    </button>
  )
}
