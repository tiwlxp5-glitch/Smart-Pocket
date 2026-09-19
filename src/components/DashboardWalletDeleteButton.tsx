'use client'

import { Archive, Loader2 } from 'lucide-react'
import { deleteWallet } from '@/app/dashboard/actions'
import { useTransition } from 'react'
import { toast } from 'sonner'

export function DashboardWalletDeleteButton({ walletId, walletName }: { walletId: string, walletName: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`คุณต้องการลบ/ซ่อนกระเป๋า "${walletName}" ใช่หรือไม่?\n(หากมีประวัติรายการ จะต้องโอนเงินออกให้เป็น 0 บาทก่อน)`)) {
      return
    }
    startTransition(async () => {
      try {
        const res = await deleteWallet(walletId)
        if (!res?.success) {
          toast.error(res?.message || 'เกิดข้อผิดพลาดในการลบกระเป๋า')
        }
      } catch (err) {
        console.error('Failed to delete wallet:', err)
        toast.error('เกิดข้อผิดพลาดในการลบกระเป๋า')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`absolute top-3 right-3 p-1.5 rounded-lg backdrop-blur-md transition shadow-2xs z-20 ${
        isPending ? 'bg-black/50 text-white cursor-not-allowed' : 'bg-black/30 hover:bg-black/50 text-white'
      }`}
      title="ลบ/ซ่อนกระเป๋า"
    >
      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />}
    </button>
  )
}
