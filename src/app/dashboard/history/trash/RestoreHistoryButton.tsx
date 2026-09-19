'use client'

import { useTransition } from 'react'
import { ArchiveRestore, Loader2 } from 'lucide-react'
import { restoreFromTrash } from '@/app/dashboard/trash-actions'
import { toast } from 'sonner'

export function RestoreHistoryButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreFromTrash(id)
      } catch (err) {
        console.error('Failed to restore from trash:', err)
        toast.error('เกิดข้อผิดพลาดในการกู้คืนรายการ')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={isPending}
      className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
      title="กู้คืนรายการนี้"
    >
      {isPending ? (
        <>
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span>กำลังกู้คืน...</span>
        </>
      ) : (
        <>
          <ArchiveRestore size={16} />
          <span>กู้คืนรายการนี้</span>
        </>
      )}
    </button>
  )
}
