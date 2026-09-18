'use client'

import React from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  pendingText?: string
}

export function SubmitButton({
  children,
  pendingText = 'กำลังดำเนินการ...',
  className = 'w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>{pendingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
