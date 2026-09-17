'use client'

import { useState } from 'react'
import { Paperclip, X, ZoomIn, ExternalLink } from 'lucide-react'

interface SlipLightboxProps {
  slipUrl: string
}

export function SlipLightbox({ slipUrl }: SlipLightboxProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Badge ปุ่มเปิด */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
        aria-label="ดูรูปสลิป"
      >
        <Paperclip size={12} />
        มีสลิป
      </button>

      {/* Lightbox Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <Paperclip size={16} className="text-blue-600" />
                <span className="font-semibold text-sm">รูปสลิปใบเสร็จ</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-full hover:bg-gray-100 transition text-gray-500"
                  title="เปิดในแท็บใหม่"
                  aria-label="เปิดในแท็บใหม่"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition text-gray-500"
                  aria-label="ปิด"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="bg-gray-50 flex items-center justify-center min-h-[260px] max-h-[70vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slipUrl}
                alt="รูปสลิป"
                className="w-full object-contain"
                loading="lazy"
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gray-50 text-xs text-gray-400 text-center border-t border-gray-100">
              กดนอก Modal หรือ ✕ เพื่อปิด
            </div>
          </div>
        </div>
      )}
    </>
  )
}
