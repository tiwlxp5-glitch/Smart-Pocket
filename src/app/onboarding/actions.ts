'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const mode = formData.get('mode') as string // 'single' | 'split'
  
  // Percentages
  const pDaily = Number(formData.get('pct_daily')) || 50
  const pInvest = Number(formData.get('pct_invest')) || 30
  const pEmergency = Number(formData.get('pct_emergency')) || 20

  // Total must be 100
  if (pDaily + pInvest + pEmergency !== 100) {
    throw new Error('สัดส่วนเปอร์เซ็นต์รวมกันต้องได้ 100%')
  }

  // Clear existing default wallets and buckets created by handle_new_user
  await supabase.from('buckets').delete().eq('user_id', user.id)
  await supabase.from('wallets').delete().eq('user_id', user.id)

  if (mode === 'single') {
    const bankId = formData.get('single_bank') as string
    const bankName = formData.get('single_bank_name') as string

    // 1. Create 1 Wallet
    const { data: wallet } = await supabase.from('wallets').insert({
      user_id: user.id,
      name: bankName,
      type: 'bank',
      bank_name: bankId,
      color: '#3B82F6',
      icon: 'wallet',
      opening_balance: 0,
      balance: 0,
      is_default: true
    }).select().single()

    // 2. Create 3 Buckets linking to the same single wallet
    if (wallet) {
      await supabase.from('buckets').insert([
        { user_id: user.id, name: 'เงินใช้ชีวิตประจำวัน', icon: 'coffee', color: '#3B82F6', allocation_percentage: pDaily, default_wallet_id: wallet.id },
        { user_id: user.id, name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', allocation_percentage: pInvest, default_wallet_id: wallet.id },
        { user_id: user.id, name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', allocation_percentage: pEmergency, default_wallet_id: wallet.id }
      ])
    }
  } else {
    // Mode Split
    const wDailyId = formData.get('split_daily_bank') as string
    const wDailyName = formData.get('split_daily_name') as string
    
    const wInvestId = formData.get('split_invest_bank') as string
    const wInvestName = formData.get('split_invest_name') as string
    
    const wEmergencyId = formData.get('split_emergency_bank') as string
    const wEmergencyName = formData.get('split_emergency_name') as string

    // 1. Create 3 Wallets
    const { data: wallets } = await supabase.from('wallets').insert([
      { user_id: user.id, name: wDailyName, type: 'bank', bank_name: wDailyId, color: '#3B82F6', icon: 'wallet', opening_balance: 0, balance: 0, is_default: true },
      { user_id: user.id, name: wInvestName, type: 'bank', bank_name: wInvestId, color: '#10B981', icon: 'wallet', opening_balance: 0, balance: 0, is_default: false },
      { user_id: user.id, name: wEmergencyName, type: 'bank', bank_name: wEmergencyId, color: '#F59E0B', icon: 'wallet', opening_balance: 0, balance: 0, is_default: false }
    ]).select()

    // 2. Create 3 Buckets linked respectively
    if (wallets && wallets.length === 3) {
      await supabase.from('buckets').insert([
        { user_id: user.id, name: 'เงินใช้ชีวิตประจำวัน', icon: 'coffee', color: '#3B82F6', allocation_percentage: pDaily, default_wallet_id: wallets[0].id },
        { user_id: user.id, name: 'เงินลงทุน', icon: 'trending-up', color: '#10B981', allocation_percentage: pInvest, default_wallet_id: wallets[1].id },
        { user_id: user.id, name: 'เงินสำรองฉุกเฉิน', icon: 'shield', color: '#F59E0B', allocation_percentage: pEmergency, default_wallet_id: wallets[2].id }
      ])
    }
  }

  // Mark as onboarded
  await supabase.from('profiles').update({ is_onboarded: true }).eq('id', user.id)

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
