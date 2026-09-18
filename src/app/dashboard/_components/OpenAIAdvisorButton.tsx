'use client'

import { Bot } from 'lucide-react'

export default function OpenAIAdvisorButton() {
  const handleOpen = () => {
    window.dispatchEvent(new Event('open-smart-ai'))
  }

  return (
    <button
      onClick={handleOpen}
      className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-500 rounded-full text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/30 transition active:scale-95"
      title="Smart Advisor - ที่ปรึกษาการเงิน"
    >
      <Bot size={20} />
    </button>
  )
}