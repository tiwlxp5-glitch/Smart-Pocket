import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // Fetch all buckets ordered by created_at
  const { data: buckets, error } = await supabase
    .from('buckets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error || !buckets) {
    return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 })
  }

  let deletedCount = 0
  const seenNames = new Set<string>()

  for (const bucket of buckets) {
    if (seenNames.has(bucket.name)) {
      // It's a duplicate. Delete it if balance is 0.
      if (Number(bucket.balance) === 0) {
        await supabase.from('buckets').delete().eq('id', bucket.id)
        deletedCount++
      }
    } else {
      // First time seeing this name
      seenNames.add(bucket.name)
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `ทำความสะอาดถังงบที่ซ้ำซ้อนเสร็จสิ้น (ลบไป ${deletedCount} ถัง)`,
    deleted: deletedCount
  })
}
