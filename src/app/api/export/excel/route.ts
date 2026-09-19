import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateExcelWorkbook, ExcelTransactionItem } from '@/utils/exportExcel'
import { getStartOfMonthBkk, getStartOfYearBkk, getCurrentBkkDateParts, getBkkMonthNameThai } from '@/utils/timezone'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const timeframe = body.timeframe || 'this_month'
    let transactions: ExcelTransactionItem[] = body.items

    const { year: curYear, month: curMonth } = getCurrentBkkDateParts()
    let timeframeLabel = 'ทั้งหมด (All Time)'
    let fileSuffix = 'all'

    if (timeframe === 'this_month') {
      const monthName = getBkkMonthNameThai()
      timeframeLabel = `เดือน${monthName} ${curYear + 543} (${curYear})`
      fileSuffix = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`
    } else if (timeframe === 'this_year') {
      timeframeLabel = `ประจำปี พ.ศ. ${curYear + 543} (${curYear})`
      fileSuffix = `${curYear}`
    }

    // Filter by timeframe if full list is provided
    if (transactions && transactions.length > 0) {
      transactions = transactions.filter((tx) => {
        const txDate = new Date(tx.transaction_date)
        const txBkkParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(txDate)
        const [txY, txM] = txBkkParts.split('-').map(Number)
        
        if (timeframe === 'this_month') {
          return txY === curYear && (txM - 1) === curMonth
        }
        if (timeframe === 'this_year') {
          return txY === curYear
        }
        return true
      })
    } else {
      // Query from DB if not passed from client
      let query = supabase
        .from('transactions')
        .select(`
          id, type, amount, note, receiver, transaction_date,
          buckets ( name )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      if (timeframe === 'this_month') {
        const startOfMonth = getStartOfMonthBkk()
        query = query.gte('transaction_date', startOfMonth)
      } else if (timeframe === 'this_year') {
        const startOfYear = getStartOfYearBkk()
        query = query.gte('transaction_date', startOfYear)
      }

      const { data } = await query
      transactions = (data || []) as unknown as ExcelTransactionItem[]
    }

    const excelBuffer = await generateExcelWorkbook(transactions, timeframeLabel)

    return new Response(Buffer.from(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="smart_pocket_report_${fileSuffix}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('API Export Excel Error:', error)
    return new NextResponse('Failed to generate Excel report', { status: 500 })
  }
}
