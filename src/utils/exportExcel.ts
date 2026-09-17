import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export interface ExcelTransactionItem {
  id: string
  type: string
  amount: number
  note: string | null
  receiver: string | null
  transaction_date: string
  buckets?: { name?: string } | { name?: string }[] | null
}

export async function generateExcelWorkbook(
  transactions: ExcelTransactionItem[],
  timeframeLabel: string
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Smart Pocket'
  wb.lastModifiedBy = 'Smart Pocket'
  wb.created = new Date()
  wb.modified = new Date()

  const ws = wb.addWorksheet('รายงานบันทึกการเงิน', {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 22 }
  })

  // 1. Column Widths (กว้างพอดี ไม่เกิด ###### แน่นอน)
  ws.columns = [
    { key: 'no', width: 8 },
    { key: 'date', width: 16 },
    { key: 'time', width: 12 },
    { key: 'type', width: 15 },
    { key: 'amount', width: 22 },
    { key: 'bucket', width: 24 },
    { key: 'note', width: 34 },
    { key: 'receiver', width: 24 },
  ]

  // Calculate Totals
  let totalIncome = 0
  let totalExpense = 0
  transactions.forEach((tx) => {
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income') totalIncome += amt
    else if (tx.type === 'expense') totalExpense += amt
  })
  const netBalance = totalIncome - totalExpense

  // 2. Title Block (Row 1)
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'SMART POCKET - รายงานสรุปรายการรับ-จ่าย'
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF1E3A8A' } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 32

  // Subtitle (Row 2)
  ws.mergeCells('A2:H2')
  const subCell = ws.getCell('A2')
  const nowStr = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  subCell.value = `ช่วงเวลา: ${timeframeLabel}  |  วันที่ส่งออกเอกสาร: ${nowStr}  |  จัดทำโดย Smart Pocket Financial App`
  subCell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF64748B' } }
  subCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(2).height = 18

  // Blank Row 3
  ws.getRow(3).height = 8

  // 3. KPI Summary Cards (Rows 4 & 5)
  // KPI 1: Income (A4:B5)
  ws.mergeCells('A4:B4')
  ws.getCell('A4').value = 'รายรับรวมทั้งหมด (Total Income)'
  ws.getCell('A4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF065F46' }, bold: true }
  ws.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' }

  ws.mergeCells('A5:B5')
  ws.getCell('A5').value = totalIncome
  ws.getCell('A5').numFmt = '฿#,##0.00'
  ws.getCell('A5').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF059669' } }
  ws.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' }

  for (let r = 4; r <= 5; r++) {
    for (let c = 1; c <= 2; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        left: { style: 'thin', color: { argb: 'FFA7F3D0' } },
        right: { style: 'thin', color: { argb: 'FFA7F3D0' } },
      }
    }
  }

  // KPI 2: Expense (C4:D5)
  ws.mergeCells('C4:D4')
  ws.getCell('C4').value = 'รายจ่ายรวมทั้งหมด (Total Expense)'
  ws.getCell('C4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF9F1239' }, bold: true }
  ws.getCell('C4').alignment = { vertical: 'middle', horizontal: 'center' }

  ws.mergeCells('C5:D5')
  ws.getCell('C5').value = totalExpense
  ws.getCell('C5').numFmt = '฿#,##0.00'
  ws.getCell('C5').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFDC2626' } }
  ws.getCell('C5').alignment = { vertical: 'middle', horizontal: 'center' }

  for (let r = 4; r <= 5; r++) {
    for (let c = 3; c <= 4; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } }
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFFECDD3' } },
        bottom: { style: 'thin', color: { argb: 'FFFECDD3' } },
        left: { style: 'thin', color: { argb: 'FFFECDD3' } },
        right: { style: 'thin', color: { argb: 'FFFECDD3' } },
      }
    }
  }

  // KPI 3: Net Cash Flow (E4:F5)
  ws.mergeCells('E4:F4')
  ws.getCell('E4').value = 'ยอดคงเหลือสุทธิ (Net Cash Flow)'
  ws.getCell('E4').font = { name: 'Segoe UI', size: 9, color: { argb: 'FF1E40AF' }, bold: true }
  ws.getCell('E4').alignment = { vertical: 'middle', horizontal: 'center' }

  ws.mergeCells('E5:F5')
  ws.getCell('E5').value = netBalance
  ws.getCell('E5').numFmt = '฿#,##0.00'
  ws.getCell('E5').font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: netBalance >= 0 ? 'FF2563EB' : 'FFDC2626' } }
  ws.getCell('E5').alignment = { vertical: 'middle', horizontal: 'center' }

  for (let r = 4; r <= 5; r++) {
    for (let c = 5; c <= 6; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        right: { style: 'thin', color: { argb: 'FFBFDBFE' } },
      }
    }
  }

  // Blank Row 6
  ws.getRow(6).height = 14

  // 4. Data Table Header (Row 7)
  const headers = [
    'ลำดับ',
    'วันที่',
    'เวลา',
    'ประเภท',
    'จำนวนเงิน (บาท)',
    'กระเป๋าเงิน',
    'บันทึกช่วยจำ',
    'ผู้รับเงิน / ร้านค้า'
  ]
  const headerRow = ws.getRow(7)
  headerRow.height = 28

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = h
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: idx === 4 ? 'right' : (idx < 4 ? 'center' : 'left') 
    }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    }
  })

  // 5. Data Rows (Row 8+)
  transactions.forEach((tx, i) => {
    const rowNum = 8 + i
    const row = ws.getRow(rowNum)
    row.height = 24

    const isEven = i % 2 === 1
    const bgArgb = isEven ? 'FFF8FAFC' : 'FFFFFFFF'
    const isIncome = tx.type === 'income'

    const txDate = new Date(tx.transaction_date)
    const dateStr = format(txDate, 'yyyy-MM-dd')
    const timeStr = format(txDate, 'HH:mm:ss')
    const typeLabel = isIncome ? 'รายรับ' : tx.type === 'expense' ? 'รายจ่าย' : 'โอนเงิน'

    let bucketName = '-'
    if (Array.isArray(tx.buckets) && tx.buckets.length > 0) {
      bucketName = tx.buckets[0]?.name || '-'
    } else if (tx.buckets && typeof tx.buckets === 'object' && 'name' in tx.buckets) {
      bucketName = (tx.buckets as { name?: string }).name || '-'
    }

    const rowCells = [
      { col: 1, val: i + 1, align: 'center' as const },
      { col: 2, val: dateStr, align: 'center' as const },
      { col: 3, val: timeStr, align: 'center' as const },
      { col: 4, val: typeLabel, align: 'center' as const, bold: true, color: isIncome ? 'FF059669' : 'FFDC2626' },
      { col: 5, val: Number(tx.amount), align: 'right' as const, bold: true, numFmt: '#,##0.00', color: isIncome ? 'FF059669' : 'FFDC2626' },
      { col: 6, val: bucketName, align: 'left' as const },
      { col: 7, val: tx.note || '-', align: 'left' as const },
      { col: 8, val: tx.receiver || '-', align: 'left' as const },
    ]

    rowCells.forEach((c) => {
      const cell = row.getCell(c.col)
      cell.value = c.val
      cell.alignment = { vertical: 'middle', horizontal: c.align }
      if (c.numFmt) cell.numFmt = c.numFmt
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: !!c.bold,
        color: { argb: c.color || 'FF1E293B' }
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
  })

  // 6. Total Summary Row
  const totalRowNum = 8 + transactions.length
  const totalRow = ws.getRow(totalRowNum)
  totalRow.height = 26

  ws.mergeCells(`A${totalRowNum}:D${totalRowNum}`)
  const totalLabelCell = ws.getCell(`A${totalRowNum}`)
  totalLabelCell.value = 'ยอดรวมรายการทั้งหมด'
  totalLabelCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF1E293B' } }
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' }

  const totalAmountCell = ws.getCell(`E${totalRowNum}`)
  // Use SUM of expenses/incomes or formula
  totalAmountCell.value = netBalance
  totalAmountCell.numFmt = '฿#,##0.00'
  totalAmountCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E3A8A' } }
  totalAmountCell.alignment = { vertical: 'middle', horizontal: 'right' }

  // Fill and borders for total row
  for (let c = 1; c <= 8; c++) {
    const cell = totalRow.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Double accounting line!
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    }
  }

  // 7. Auto-filter
  if (transactions.length > 0) {
    ws.autoFilter = { from: 'A7', to: `H${totalRowNum - 1}` }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}
