'use client'

import { motion } from 'framer-motion'

export function AuthCard({ children, mode }: { children: React.ReactNode, mode: 'login' | 'signup' }) {
  const xOffset = mode === 'login' ? -40 : 40;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: xOffset, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
    >
      {children}
    </motion.div>
  )
}
