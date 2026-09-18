'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Layers, PieChart, ShieldCheck, TrendingUp, Coffee, Wallet, Loader2 } from 'lucide-react'
import { completeOnboarding } from './actions'
import { BANK_PRESETS } from '@/utils/walletHelper'

type Mode = 'single' | 'split' | null

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode>(null)
  
  // Single mode state
  const [singleBank, setSingleBank] = useState(BANK_PRESETS[0].code)
  
  // Split mode state
  const [splitDaily, setSplitDaily] = useState(BANK_PRESETS[0].code)
  const [splitInvest, setSplitInvest] = useState(BANK_PRESETS[1].code)
  const [splitEmergency, setSplitEmergency] = useState(BANK_PRESETS[2].code)
  
  // Percentages
  const [pDaily, setPDaily] = useState('50')
  const [pInvest, setPInvest] = useState('30')
  const [pEmergency, setPEmergency] = useState('20')
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const getBankName = (code: string) => BANK_PRESETS.find(b => b.code === code)?.name || code

  const handleNext = () => {
    if (step === 1 && !mode) return
    setStep(s => s + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMsg('')
    
    const formData = new FormData()
    formData.append('mode', mode!)
    formData.append('pct_daily', pDaily)
    formData.append('pct_invest', pInvest)
    formData.append('pct_emergency', pEmergency)
    
    if (mode === 'single') {
      formData.append('single_bank', singleBank)
      formData.append('single_bank_name', getBankName(singleBank))
    } else {
      formData.append('split_daily_bank', splitDaily)
      formData.append('split_daily_name', getBankName(splitDaily))
      formData.append('split_invest_bank', splitInvest)
      formData.append('split_invest_name', getBankName(splitInvest))
      formData.append('split_emergency_bank', splitEmergency)
      formData.append('split_emergency_name', getBankName(splitEmergency))
    }

    try {
      await completeOnboarding(formData)
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center max-w-md mx-auto relative p-6">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="mb-8 mt-4 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          {step === 1 && 'คุณจัดการเงินแบบไหน?'}
          {step === 2 && 'บัญชีธนาคารที่คุณใช้'}
          {step === 3 && 'สัดส่วนเป้าหมายของคุณ'}
        </h1>
        <p className="text-sm text-gray-500">
          {step === 1 && 'เพื่อจัดเตรียมกระเป๋าเงินให้ตรงกับสไตล์ของคุณ'}
          {step === 2 && 'ให้เราสร้างกระเป๋าเงินผูกกับธนาคารให้คุณอัตโนมัติ'}
          {step === 3 && 'แอพจะคำนวณเงินเข้าแต่ละถังให้ตามสัดส่วนนี้'}
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl text-center border border-rose-100">
          {errorMsg}
        </div>
      )}

      <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="flex flex-col flex-1">
        
        {/* STEP 1 */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right fade-in duration-300">
            <label className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${mode === 'single' ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
              <input type="radio" name="mode" value="single" checked={mode === 'single'} onChange={() => setMode('single')} className="hidden" />
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                {mode === 'single' && <CheckCircle2 className="text-blue-600" size={24} />}
              </div>
              <h3 className="font-bold text-gray-900 mt-2 text-lg">1 บัญชีรวมทุกอย่าง</h3>
              <p className="text-sm text-gray-500">คุณรับและเก็บเงินทุกประเภทไว้ในบัญชีธนาคารเดียว ไม่ได้เปิดบัญชีแยก</p>
            </label>

            <label className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${mode === 'split' ? 'border-emerald-600 bg-emerald-50 shadow-sm' : 'border-gray-200 bg-white hover:border-emerald-200'}`}>
              <input type="radio" name="mode" value="split" checked={mode === 'split'} onChange={() => setMode('split')} className="hidden" />
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Layers size={24} />
                </div>
                {mode === 'split' && <CheckCircle2 className="text-emerald-600" size={24} />}
              </div>
              <h3 className="font-bold text-gray-900 mt-2 text-lg">แยกหลายบัญชี</h3>
              <p className="text-sm text-gray-500">คุณมีบัญชีแยกชัดเจน เช่น บัญชีนึงไว้ใช้จ่าย อีกบัญชีไว้เก็บเงินฉุกเฉิน</p>
            </label>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right fade-in duration-300">
            {mode === 'single' ? (
              <div className="bg-white p-5 rounded-2xl border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">ธนาคารหลักที่คุณใช้รับเงิน</label>
                <select 
                  value={singleBank} 
                  onChange={(e) => setSingleBank(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BANK_PRESETS.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Coffee size={20}/></div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">เงินใช้ชีวิตประจำวัน</label>
                    <select value={splitDaily} onChange={(e) => setSplitDaily(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {BANK_PRESETS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><TrendingUp size={20}/></div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">เงินลงทุน / เก็บระยะยาว</label>
                    <select value={splitInvest} onChange={(e) => setSplitInvest(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {BANK_PRESETS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><ShieldCheck size={20}/></div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">เงินสำรองฉุกเฉิน</label>
                    <select value={splitEmergency} onChange={(e) => setSplitEmergency(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {BANK_PRESETS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right fade-in duration-300">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl text-xs flex gap-3 items-start border border-blue-100">
              <PieChart className="shrink-0 mt-0.5" size={16} />
              <p>เราแนะนำสูตร 50/30/20 สำหรับเริ่มต้น แต่คุณสามารถปรับ % ตามเป้าหมายส่วนตัวได้เลย</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Coffee size={20}/></div>
                <div className="flex-1 font-bold text-sm text-gray-900">ใช้ชีวิตประจำวัน</div>
                <div className="flex items-center gap-1 w-24">
                  <input type="number" value={pDaily} onChange={e => setPDaily(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-gray-900" />
                  <span className="text-gray-500 font-bold">%</span>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp size={20}/></div>
                <div className="flex-1 font-bold text-sm text-gray-900">ลงทุน / เก็บออม</div>
                <div className="flex items-center gap-1 w-24">
                  <input type="number" value={pInvest} onChange={e => setPInvest(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-gray-900" />
                  <span className="text-gray-500 font-bold">%</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><ShieldCheck size={20}/></div>
                <div className="flex-1 font-bold text-sm text-gray-900">สำรองฉุกเฉิน</div>
                <div className="flex items-center gap-1 w-24">
                  <input type="number" value={pEmergency} onChange={e => setPEmergency(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center font-bold text-gray-900" />
                  <span className="text-gray-500 font-bold">%</span>
                </div>
              </div>
            </div>
            
            <div className={`text-center font-bold mt-2 ${Number(pDaily)+Number(pInvest)+Number(pEmergency) === 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
              รวม: {Number(pDaily)+Number(pInvest)+Number(pEmergency)}%
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 pb-4 flex gap-3">
          {step > 1 && (
            <button 
              type="button" 
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-4 rounded-2xl font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
            >
              ย้อนกลับ
            </button>
          )}
          
          <button
            type="submit"
            disabled={
              (step === 1 && !mode) || 
              (step === 3 && (Number(pDaily)+Number(pInvest)+Number(pEmergency) !== 100)) || 
              isLoading
            }
            className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                {step === 3 ? 'เริ่มใช้งาน Smart Pocket' : 'ดำเนินการต่อ'}
                {step < 3 && <ChevronRight size={20} />}
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
