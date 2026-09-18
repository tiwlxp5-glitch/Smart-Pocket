'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Check, Sparkles, Smartphone, Eye, ExternalLink, Download } from 'lucide-react'

interface IconConcept {
  id: string
  name: string
  title: string
  subtitle: string
  file: string
  conceptDescription: string
  tags: string[]
  highlights: string[]
}

const CONCEPTS: IconConcept[] = [
  {
    id: 'dashboard-blue',
    name: 'แบบที่ 1: Dashboard Royal Blue',
    title: 'ถอดแบบจากการ์ดยอดเงินหลัก',
    subtitle: 'สีน้ำเงินกรมท่าลึก ลายการ์ดยอดเงินรวมของแอพ + เหรียญรับ/จ่าย',
    file: '/app-icon-dashboard-blue.svg',
    conceptDescription: 'ใช้พาเลตต์สีและ Gradient เดียวกับการ์ดแสดงยอดเงินรวมในหน้าแรกของแอพ (slate-900 via blue-900 to indigo-950) ผสานกระเป๋ากระจกฝ้าโมเดิร์น พร้อมป้าย +฿ รายรับสีเขียวมรกต และ −฿ รายจ่ายสีชมพูคอรัล',
    tags: ['In-App Palette', 'Total Balance Card', 'Frosted Wallet'],
    highlights: ['สีเดียวกับการ์ดยอดเงินหลักในแอพ 100%', 'มีแถบสัดส่วน Pocket Split ด้านใน', 'ป้าย +฿ และ −฿ ชัดเจนสะดุดตา']
  },
  {
    id: 'clean-buckets',
    name: 'แบบที่ 2: Clean White & 3 Buckets',
    title: 'คลีนการ์ดขาว + ถังงบ 3 สี',
    subtitle: 'การ์ดขาวคลีนสไตล์ UI ภายในแอพ + ถังงบ 3 สีของระบบ',
    file: '/app-icon-clean-buckets.svg',
    conceptDescription: 'โทนสีขาวคลีนสะอาดตาเหมือนการ์ดในหน้า Dashboard โดดเด่นด้วยกระเป๋าเงินสี Royal Blue และแท็บงบประมาณ 3 ถังหลักของระบบ Smart Pocket (ส้มสำรองฉุกเฉิน, เขียวลงทุน, ฟ้าใช้ชีวิต)',
    tags: ['Clean White Card', '3-Bucket Envelopes', 'Friendly Minimal'],
    highlights: ['ตรงกับระบบแบ่ง 3 ถังงบของแอพ', 'พื้นขาวสะอาด สบายตา เข้ากับมือถือทุกเครื่อง', 'กระเป๋า Royal Blue เอกลักษณ์ของแบรนด์']
  },
  {
    id: 'cashflow-pills',
    name: 'แบบที่ 3: In-Out Cashflow Balance',
    title: 'การ์ดรับเข้า-จ่ายออกเดือนนี้',
    subtitle: 'ถอดแบบจากการ์ดสรุปสถิติการเงินเดือนนี้ในหน้า Dashboard',
    file: '/app-icon-cashflow-pills.svg',
    conceptDescription: 'จำลองการ์ดสถิติการเงินเดือนนี้ของแอพมาเป็นไอคอนย่อส่วน บนพื้นหลัง Royal Blue มีแถบรับเข้าสีเขียว (+฿ 55,000) และจ่ายออกสีชมพู (−฿ 12,500) ชัดเจนแม้มองจากระยะไกล',
    tags: ['Monthly Analytics', 'Royal Blue Brand', 'High Contrast'],
    highlights: ['ถอดแบบจากวิดเจ็ตสรุปรายรับ-รายจ่ายของแอพ', 'อ่านรู้เรื่องทันทีว่าคือแอพรายรับรายจ่าย', 'คู่สีเขียว-ชมพูบนน้ำเงิน Royal Blue เด่นชัดมาก']
  },
  {
    id: 'smart-wallet-app',
    name: 'แบบที่ 4: Smart Pocket Pure Minimal',
    title: 'กระเป๋าไอคอนแอพ คลีนๆ สบายตา',
    subtitle: 'ไอคอนกระเป๋าเงินสไตล์ Header และ Bottom Nav ของแอพจริง',
    file: '/app-icon-smart-wallet-app.svg',
    conceptDescription: 'เน้นความเรียบง่ายเป็นกันเองเหมือนไอคอนกระเป๋าใน Header และ Bottom Nav ของแอพ กระเป๋าสีขาวมนสะอาดบนพื้นหลัง Royal Blue พร้อมเหรียญเขียวรับ (+) และเหรียญชมพูจ่าย (−) เคียงข้าง',
    tags: ['App Header & Nav', 'Pure Minimal', 'Friendly Wallet'],
    highlights: ['ไอคอนกระเป๋าทรงเดียวกับที่ใช้ในตัวแอพ', 'จุดสี 3 ถังงบที่ตัวกระเป๋า', 'ดูเป็นมิตร ใช้งานง่าย ไม่ซับซ้อน']
  }
]

export default function IconPreviewPage() {
  const [selectedId, setSelectedId] = useState<string>('dashboard-blue')
  const [phoneWallpaper, setPhoneWallpaper] = useState<'slate' | 'aurora' | 'midnight'>('slate')

  const selectedConcept = CONCEPTS.find(c => c.id === selectedId) || CONCEPTS[0]

  const wallpapers = {
    slate: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
    aurora: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-rose-950',
    midnight: 'bg-gradient-to-b from-gray-950 to-black'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <Link 
                href="/"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Smart Pocket App Icon Studio</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                    100% Non-AI Vector
                  </span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  ทดสอบและเปรียบเทียบไอคอนแอพสำหรับติดตั้งบนหน้าจอมือถือ (PWA / Mobile App Icon) ทั้ง 4 แนวคิด
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5"
            >
              ไปยัง Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {CONCEPTS.map((concept, idx) => {
            const isSelected = concept.id === selectedId
            return (
              <button
                key={concept.id}
                onClick={() => setSelectedId(concept.id)}
                className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 text-white'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md bg-slate-950 border border-slate-800">
                    <Image
                      src={concept.file}
                      alt={concept.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-blue-400 mb-0.5">สไตล์ที่ {idx + 1}</div>
                  <div className="font-bold text-sm text-white line-clamp-1">{concept.title}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Main Stage: Mobile Simulator + Detailed Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* Left Column: Phone Simulator (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            {/* Wallpaper Switcher */}
            <div className="flex items-center gap-2 mb-4 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400">
              <Smartphone size={14} className="text-slate-400" />
              <span>Wallpaper:</span>
              <button 
                onClick={() => setPhoneWallpaper('slate')}
                className={`px-2 py-0.5 rounded-lg transition ${phoneWallpaper === 'slate' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-slate-200'}`}
              >
                Slate
              </button>
              <button 
                onClick={() => setPhoneWallpaper('aurora')}
                className={`px-2 py-0.5 rounded-lg transition ${phoneWallpaper === 'aurora' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-slate-200'}`}
              >
                Aurora
              </button>
              <button 
                onClick={() => setPhoneWallpaper('midnight')}
                className={`px-2 py-0.5 rounded-lg transition ${phoneWallpaper === 'midnight' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-slate-200'}`}
              >
                Pure Dark
              </button>
            </div>

            {/* Phone Bezel */}
            <div className="relative w-[310px] h-[630px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700/80 shadow-blue-950/40">
              
              {/* Dynamic Island / Speaker Notch */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20 flex items-center justify-end px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-950 border border-slate-800" />
              </div>

              {/* Phone Screen Container */}
              <div className={`w-full h-full rounded-[40px] overflow-hidden relative flex flex-col justify-between p-5 pt-8 select-none ${wallpapers[phoneWallpaper]}`}>
                
                {/* Status Bar */}
                <div className="flex justify-between items-center text-[11px] font-semibold text-white/90 px-2 pt-1">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span>5G</span>
                    <div className="w-4 h-2 border border-white/80 rounded-sm p-0.5 flex items-center">
                      <div className="w-2.5 h-1 bg-white rounded-2xs" />
                    </div>
                  </div>
                </div>

                {/* Clock & Widget Area */}
                <div className="mt-6 text-center">
                  <div className="text-4xl font-extralight tracking-tight text-white/95">09:41</div>
                  <div className="text-xs font-medium text-white/70 mt-1">วันศุกร์ที่ 18 กันยายน</div>

                  {/* Finance Glance Widget */}
                  <div className="mt-5 mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-3 text-left border border-white/15">
                    <div className="text-[10px] text-white/70 flex justify-between items-center">
                      <span>Smart Pocket Summary</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-sm font-bold text-white mt-1">฿ 42,500.00</div>
                    <div className="flex items-center gap-2 mt-1.5 text-[9px]">
                      <span className="text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded">+ ฿55,000 เข้า</span>
                      <span className="text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded">− ฿12,500 ออก</span>
                    </div>
                  </div>
                </div>

                {/* Home Screen App Grid */}
                <div className="grid grid-cols-4 gap-y-5 gap-x-2 my-auto px-1">
                  
                  {/* Other Dummy Apps */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      รูปภาพ
                    </div>
                    <span className="text-[10px] text-white/80 font-medium">Photos</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      แชท
                    </div>
                    <span className="text-[10px] text-white/80 font-medium">Messages</span>
                  </div>

                  {/* THE STAR OF THE SHOW: SMART POCKET APP */}
                  <div className="flex flex-col items-center gap-1 relative group cursor-pointer">
                    <div className="relative w-13 h-13 rounded-2xl overflow-hidden shadow-xl ring-2 ring-emerald-400/80 shadow-emerald-500/20 transition-transform active:scale-95">
                      <Image
                        src={selectedConcept.file}
                        alt="Smart Pocket Icon"
                        width={52}
                        height={52}
                        className="w-full h-full object-cover"
                        priority
                      />
                      {/* Notification Dot */}
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                    </div>
                    <span className="text-[10px] text-white font-bold tracking-tight bg-slate-950/60 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      Smart Pocket
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-400 flex items-center justify-center text-white text-xs font-bold shadow-md">
                      ตั้งค่า
                    </div>
                    <span className="text-[10px] text-white/80 font-medium">Settings</span>
                  </div>
                </div>

                {/* Bottom Dock */}
                <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-2.5 flex justify-around items-center border border-white/20 mb-1">
                  <div className="w-11 h-11 rounded-2xl bg-green-500 flex items-center justify-center text-white text-xs shadow-md">📞</div>
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs shadow-md">🌐</div>
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs shadow-md">🎵</div>
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-white text-xs shadow-md">⚙️</div>
                </div>

                {/* Home Indicator Bar */}
                <div className="w-28 h-1 bg-white/60 rounded-full mx-auto" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              * จำลองการแสดงผลไอคอนบนหน้าจอ iPhone Home Screen จริง
            </p>
          </div>

          {/* Right Column: Concept Details & Micro-scale Tests (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Active Card Specs */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Selected Style
                    </span>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      512 x 512 px Vector
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">{selectedConcept.name}</h2>
                  <p className="text-blue-300 text-sm font-medium">{selectedConcept.subtitle}</p>
                </div>

                <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800 shrink-0">
                  <Image
                    src={selectedConcept.file}
                    alt={selectedConcept.title}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <p className="text-slate-300 text-sm mt-4 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                {selectedConcept.conceptDescription}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedConcept.tags.map(t => (
                  <span key={t} className="text-xs font-medium px-3 py-1 rounded-lg bg-slate-800 text-slate-300">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Highlights */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  จุดเด่นของดีไซน์นี้:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedConcept.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-300 leading-snug">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-800">
                <a
                  href={selectedConcept.file}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 transition"
                >
                  <Eye size={16} />
                  เปิดดูไฟล์ SVG เต็มจอ
                  <ExternalLink size={14} className="text-slate-400" />
                </a>
                <a
                  href={selectedConcept.file}
                  download={selectedConcept.file.replace('/', '')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 transition"
                >
                  <Download size={16} />
                  ดาวน์โหลดไฟล์ SVG นี้
                </a>
              </div>
            </div>

            {/* Micro-scale Legibility Test */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <span>Micro-Scale Legibility Test</span>
                <span className="text-xs font-normal text-slate-400">(ทดสอบความคมชัดทุกขนาดหน้าจอ)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                ไอคอนที่ดีต้องมองเห็นรู้เรื่องแม้จะถูกย่อเหลือขนาดเล็กจิ๋วเท่าเม็ดถั่วบนหน้าจอโทรศัพท์
              </p>

              <div className="flex flex-wrap items-end justify-between gap-4 p-6 bg-slate-950 rounded-2xl border border-slate-800">
                
                {/* 32px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow-sm">
                    <Image src={selectedConcept.file} alt="32px" width={32} height={32} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">32px</span>
                  <span className="text-[9px] text-slate-500">Favicon</span>
                </div>

                {/* 48px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shadow-md">
                    <Image src={selectedConcept.file} alt="48px" width={48} height={48} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">48px</span>
                  <span className="text-[9px] text-slate-500">Android</span>
                </div>

                {/* 64px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-700 shadow-lg">
                    <Image src={selectedConcept.file} alt="64px" width={64} height={64} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">64px</span>
                  <span className="text-[9px] text-slate-500">iOS Retina</span>
                </div>

                {/* 96px */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border border-slate-700 shadow-xl">
                    <Image src={selectedConcept.file} alt="96px" width={96} height={96} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">96px</span>
                  <span className="text-[9px] text-slate-500">PWA HD</span>
                </div>

                {/* 128px */}
                <div className="hidden sm:flex flex-col items-center gap-2">
                  <div className="w-32 h-32 rounded-[28px] overflow-hidden border border-slate-700 shadow-2xl">
                    <Image src={selectedConcept.file} alt="128px" width={128} height={128} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">128px</span>
                  <span className="text-[9px] text-slate-500">Store List</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* All 4 Concepts Side-by-Side Comparison */}
        <div className="mb-12">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-white">เปรียบเทียบทั้ง 4 สไตล์แบบเทียบข้างเคียง</h2>
            <p className="text-slate-400 text-sm mt-1">
              คลิกการ์ดเพื่อทดลองสลับดูบนหน้าจอมือถือจริงด้านบนได้ทันที
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CONCEPTS.map((concept, idx) => {
              const isSelected = concept.id === selectedId
              return (
                <div
                  key={concept.id}
                  onClick={() => setSelectedId(concept.id)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-blue-500 shadow-2xl shadow-blue-950/60 ring-2 ring-blue-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Icon Large Box */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner mb-4 flex items-center justify-center p-3">
                      <Image
                        src={concept.file}
                        alt={concept.title}
                        width={200}
                        height={200}
                        className="w-full h-full object-contain"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={12} strokeWidth={3} />
                          Active
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                      สไตล์ที่ {idx + 1}
                    </div>
                    <h3 className="font-bold text-base text-white">{concept.title}</h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {concept.conceptDescription}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono">{concept.file}</span>
                    <button
                      className={`font-semibold transition ${
                        isSelected ? 'text-blue-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'กำลังแสดงผล' : 'เลือกแบบนี้'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
