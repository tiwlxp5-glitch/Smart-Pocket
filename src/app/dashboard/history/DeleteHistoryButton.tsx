'use client'

import { useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { moveToTrash } from '@/app/dashboard/trash-actions'
import { toast } from 'sonner'

export function DeleteHistoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('คุณต้องการย้ายรายการนี้ไปที่ถังขยะใช่หรือไม่?')) return
    startTransition(async () => {
      try {
        await moveToTrash(id)
      } catch (err) {
        console.error('Failed to move to trash:', err)
        toast.error('เกิดข้อผิดพลาดในการลบรายการ')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs font-medium text-gray-400 hover:text-rose-500 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      title="ลบรายการ"
    >
      {isPending ? (
        <>
          <Loader2 size={14} className="animate-spin text-rose-500" />
          <span className="text-rose-500 font-semibold">กำลังลบ...</span>
        </>
      ) : (
        <>
          <Trash2 size={14} />
          <span>ลบรายการ</span>
        </>
      )}
    </button>
  )
}
