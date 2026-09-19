'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const name = (formData.get('name') as string)?.trim()
  const type = (formData.get('type') as string) || 'bank'
  const bankName = (formData.get('bank_name') as string) || null
  const color = (formData.get('color') as string) || '#10b981'
  const icon = (formData.get('icon') as string) || 'wallet'
  const rawOpening = formData.get('opening_balance')
  const openingBalance = rawOpening ? Number(rawOpening) : 0
  const rawCash = formData.get('cash_balance')
  const cashBalance = rawCash ? Number(rawCash) : 0
  const rawAllocation = formData.get('allocation_percentage')
  const allocationPercentage = rawAllocation ? Number(rawAllocation) : 0
  const rawBudget = formData.get('monthly_budget')
  const monthlyBudget = rawBudget && rawBudget !== '' ? Number(rawBudget) : null

  if (!name) {
    return { success: false, message: 'กรุณาระบุชื่อกระเป๋าเงิน' }
  }

  // 1. Insert Wallet
  const { data: walletData, error: walletError } = await supabase.from('wallets').insert({
    user_id: user.id,
    name,
    type,
    bank_name: bankName,
    color,
    icon,
    opening_balance: openingBalance,
    balance: openingBalance,
  }).select().single()

  if (walletError || !walletData) {
    console.error('Create wallet error:', walletError)
    return { success: false, message: 'ไม่สามารถสร้างกระเป๋าเงินได้: ' + walletError?.message }
  }

  // 2. Insert Linked Bucket
  const { error: bucketError } = await supabase.from('buckets').insert({
    user_id: user.id,
    name,
    icon,
    color,
    allocation_percentage: allocationPercentage,
    monthly_budget: monthlyBudget,
    default_wallet_id: walletData.id,
    balance: openingBalance // Initial bucket balance matches wallet
  })

  if (bucketError) {
    console.error('Create linked bucket error:', bucketError)
    // We don't rollback wallet here to keep it simple, but we should log it
  }

  // 3. Insert Cash Wallet (If applicable)
  if (type === 'bank' && cashBalance > 0) {
    const cashName = `${name} (เงินสด)`
    const { data: cashWalletData, error: cashWalletError } = await supabase.from('wallets').insert({
      user_id: user.id,
      name: cashName,
      type: 'cash',
      bank_name: bankName,
      color,
      icon,
      opening_balance: cashBalance,
      balance: cashBalance,
    }).select().single()

    if (!cashWalletError && cashWalletData) {
      await supabase.from('buckets').insert({
        user_id: user.id,
        name: cashName,
        icon,
        color,
        allocation_percentage: 0, // Keep 0 to avoid messing up 100% allocation logic
        monthly_budget: null,
        default_wallet_id: cashWalletData.id,
        balance: cashBalance
      })
    }
  }

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'สร้างกระเป๋าเงินสำเร็จ', data: walletData }
}

export async function updateWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const walletId = formData.get('wallet_id') as string
  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#10b981'
  const icon = (formData.get('icon') as string) || 'wallet'
  const rawAllocation = formData.get('allocation_percentage')
  const allocationPercentage = rawAllocation ? Number(rawAllocation) : 0
  const rawBudget = formData.get('monthly_budget')
  const monthlyBudget = rawBudget && rawBudget !== '' ? Number(rawBudget) : null

  if (!walletId || !name) {
    return { success: false, message: 'ข้อมูลไม่ถูกต้อง' }
  }

  // 0. Fetch current wallet
  const { data: currentWallet } = await supabase.from('wallets').select('type, bank_name').eq('id', walletId).single()

  // 1. Update Wallet
  const { error: walletError } = await supabase.from('wallets').update({
    name,
    color,
    icon,
    updated_at: new Date().toISOString()
  }).eq('id', walletId).eq('user_id', user.id)

  if (walletError) {
    console.error('Update wallet error:', walletError)
    return { success: false, message: 'ไม่สามารถแก้ไขกระเป๋าเงินได้' }
  }

  // 2. Update Linked Bucket
  await supabase.from('buckets').update({
    name,
    color,
    icon,
    allocation_percentage: allocationPercentage,
    monthly_budget: monthlyBudget,
    updated_at: new Date().toISOString()
  }).eq('default_wallet_id', walletId).eq('user_id', user.id)

  // 3. Update Paired Cash Wallet (if applicable)
  if (currentWallet?.type === 'bank' && currentWallet?.bank_name) {
    const cashName = `${name} (เงินสด)`
    const { data: cashWallet } = await supabase.from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'cash')
      .eq('bank_name', currentWallet.bank_name)
      .single()

    if (cashWallet) {
      await supabase.from('wallets').update({
        name: cashName,
        color,
        icon,
        updated_at: new Date().toISOString()
      }).eq('id', cashWallet.id)

      await supabase.from('buckets').update({
        name: cashName,
        color,
        icon,
        updated_at: new Date().toISOString()
      }).eq('default_wallet_id', cashWallet.id)
    }
  }

  revalidatePath('/dashboard/wallets')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกการแก้ไขเรียบร้อย' }
}

export async function deleteWallet(walletId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  // 1. Fetch wallet details
  const { data: wallet, error: fetchError } = await supabase
    .from('wallets')
    .select('is_default, balance')
    .eq('id', walletId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !wallet) {
    return { success: false, message: 'ไม่พบข้อมูลกระเป๋าเงิน' }
  }

  // 2. Check if default wallet
  if (wallet.is_default) {
    return { success: false, message: 'ไม่สามารถลบกระเป๋าหลักได้ กรุณาเปลี่ยนกระเป๋าหลักเป็นใบอื่นก่อน' }
  }

  // 3. Count transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .or(`wallet_id.eq.${walletId},to_wallet_id.eq.${walletId}`)
    .eq('user_id', user.id)

  if (countError) {
    console.error('Count transactions error:', countError)
    return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบประวัติรายการ' }
  }

  if (count === 0) {
    // Hard delete linked bucket first (to avoid ON DELETE SET NULL losing the reference)
    await supabase.from('buckets').delete().eq('default_wallet_id', walletId).eq('user_id', user.id)

    // Hard Delete Wallet
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Delete wallet error:', deleteError)
      return { success: false, message: 'ไม่สามารถลบกระเป๋าเงินได้' }
    }

    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard', 'layout')
    return { success: true, message: 'ลบกระเป๋าเงินเรียบร้อยแล้ว' }
  } else {
    // Soft Delete (Archive)
    if (Number(wallet.balance) !== 0) {
      return { success: false, message: 'ไม่สามารถลบได้เนื่องจากมียอดเงินคงเหลือ กรุณาโอนเงินออกให้เป็น 0 บาทก่อน' }
    }

    const { error: archiveError } = await supabase
      .from('wallets')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (archiveError) {
      console.error('Archive wallet error:', archiveError)
      return { success: false, message: 'ไม่สามารถซ่อนกระเป๋าเงินได้' }
    }

    // Soft delete (archive) linked bucket
    await supabase
      .from('buckets')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('default_wallet_id', walletId)
      .eq('user_id', user.id)

    revalidatePath('/dashboard/wallets')
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard', 'layout')
    return { success: true, message: 'ซ่อนกระเป๋าเงินเรียบร้อยแล้ว' }
  }
}

export async function updateBucketSettings(bucketId: string, monthlyBudget: number | null, defaultWalletId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนดำเนินการ')

  if (monthlyBudget !== null && monthlyBudget < 0) {
    return { success: false, message: 'งบประมาณต้องไม่ติดลบ' }
  }

  const { error } = await supabase
    .from('buckets')
    .update({ 
      monthly_budget: monthlyBudget,
      default_wallet_id: defaultWalletId
    })
    .eq('id', bucketId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update Bucket Settings Error:', error)
    return { success: false, message: 'ไม่สามารถบันทึกการตั้งค่าถังงบประมาณได้' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' }
}
