import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // 1. Fetch buckets and wallets
  const { data: buckets } = await supabase.from('buckets').select('*').eq('user_id', user.id).eq('is_archived', false)
  const { data: wallets } = await supabase.from('wallets').select('*').eq('user_id', user.id).eq('is_archived', false)

  if (!buckets || !wallets) {
    return NextResponse.json({ error: 'No data' })
  }

  const logs = []
  let updatedCount = 0

  // 2. Try to match buckets to wallets
  for (const bucket of buckets) {
    let targetWallet = null

    if (bucket.name.includes('ลงทุน')) {
      targetWallet = wallets.find(w => w.name.includes('ลงทุน') || w.name.includes('KBank'))
    } else if (bucket.name.includes('ฉุกเฉิน')) {
      targetWallet = wallets.find(w => w.name.includes('ฉุกเฉิน') || w.name.includes('กรุงไทย'))
    } else if (bucket.name.includes('ชีวิตประจำวัน')) {
      targetWallet = wallets.find(w => w.name.includes('ออมสิน'))
    }

    if (targetWallet && bucket.default_wallet_id !== targetWallet.id) {
      // Link them!
      const { error } = await supabase.from('buckets').update({ default_wallet_id: targetWallet.id }).eq('id', bucket.id)
      if (error) {
        logs.push(`Error updating ${bucket.name}: ${error.message}`)
      } else {
        logs.push(`✅ Linked bucket [${bucket.name}] to wallet [${targetWallet.name}]`)
        updatedCount++
      }
    } else if (targetWallet && bucket.default_wallet_id === targetWallet.id) {
      logs.push(`ℹ️ Bucket [${bucket.name}] is already correctly linked to wallet [${targetWallet.name}]`)
    } else {
      logs.push(`⚠️ Could not find a matching wallet for bucket [${bucket.name}]`)
    }
  }

  // Also clean up any extra buckets that were created with 0% allocation and same name as wallet
  for (const wallet of wallets) {
    const matchingBucket = buckets.find(b => b.name === wallet.name && (b.allocation_percentage === 0 || b.allocation_percentage === null))
    if (matchingBucket && !matchingBucket.name.includes('ชีวิตประจำวัน') && !matchingBucket.name.includes('ลงทุน') && !matchingBucket.name.includes('ฉุกเฉิน')) {
       await supabase.from('buckets').update({ is_archived: true }).eq('id', matchingBucket.id)
       logs.push(`🗑️ Archived redundant bucket [${matchingBucket.name}]`)
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Updated ${updatedCount} buckets.`,
    logs 
  })
}
