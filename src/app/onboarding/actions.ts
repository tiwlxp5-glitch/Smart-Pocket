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

  // ---------------------------------------------------------
  // Helper: Get existing wallet or create new one
  // ---------------------------------------------------------
  async function getOrCreateWallet(bankId: string, bankName: string, isDefault: boolean, color: string) {
    const { data: existing } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user!.id)
      .eq('bank_name', bankId)
      .eq('type', 'bank')
      .limit(1)
      .maybeSingle()
    
    if (existing) {
      if (isDefault) {
         await supabase.from('wallets').update({ is_default: true }).eq('id', existing.id)
      }
      return existing.id
    }
    
    const { data: newWallet } = await supabase.from('wallets').insert({
      user_id: user!.id,
      name: bankName,
      type: 'bank',
      bank_name: bankId,
      color,
      icon: 'wallet',
      opening_balance: 0,
      balance: 0,
      is_default: isDefault
    }).select('id').single()
    return newWallet?.id
  }

  // ---------------------------------------------------------
  // Helper: Upsert bucket by name
  // ---------------------------------------------------------
  async function upsertBucket(bucketName: string, icon: string, color: string, percentage: number, walletId: string | undefined) {
    if (!walletId) return

    const { data: existing } = await supabase
      .from('buckets')
      .select('id')
      .eq('user_id', user!.id)
      .eq('name', bucketName)
      .limit(1)
      .maybeSingle()
      
    if (existing) {
      // Update existing bucket
      await supabase.from('buckets').update({
        allocation_percentage: percentage,
        default_wallet_id: walletId
      }).eq('id', existing.id)
    } else {
      // Create new bucket if not found
      await supabase.from('buckets').insert({
        user_id: user!.id,
        name: bucketName,
        icon,
        color,
        allocation_percentage: percentage,
        default_wallet_id: walletId
      })
    }
  }

  if (mode === 'single') {
    const bankId = formData.get('single_bank') as string
    const bankName = formData.get('single_bank_name') as string

    const walletId = await getOrCreateWallet(bankId, bankName, true, '#3B82F6')

    await upsertBucket('เงินใช้ชีวิตประจำวัน', 'coffee', '#3B82F6', pDaily, walletId)
    await upsertBucket('เงินลงทุน', 'trending-up', '#10B981', pInvest, walletId)
    await upsertBucket('เงินสำรองฉุกเฉิน', 'shield', '#F59E0B', pEmergency, walletId)

  } else {
    // Mode Split
    const wDailyId = formData.get('split_daily_bank') as string
    const wDailyName = formData.get('split_daily_name') as string
    
    const wInvestId = formData.get('split_invest_bank') as string
    const wInvestName = formData.get('split_invest_name') as string
    
    const wEmergencyId = formData.get('split_emergency_bank') as string
    const wEmergencyName = formData.get('split_emergency_name') as string

    const wDaily_id = await getOrCreateWallet(wDailyId, wDailyName, true, '#3B82F6')
    const wInvest_id = await getOrCreateWallet(wInvestId, wInvestName, false, '#10B981')
    const wEmergency_id = await getOrCreateWallet(wEmergencyId, wEmergencyName, false, '#F59E0B')

    await upsertBucket('เงินใช้ชีวิตประจำวัน', 'coffee', '#3B82F6', pDaily, wDaily_id)
    await upsertBucket('เงินลงทุน', 'trending-up', '#10B981', pInvest, wInvest_id)
    await upsertBucket('เงินสำรองฉุกเฉิน', 'shield', '#F59E0B', pEmergency, wEmergency_id)
  }

  // Mark as onboarded
  await supabase.from('profiles').update({ is_onboarded: true }).eq('id', user.id)

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
