import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ─── SQL Sanitizer (DB Command Prevention) ─────────────────────────
// ห้าม INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, EXEC เด็ดขาด

const BLOCKED_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'MERGE',
  'CALL', 'SET ', 'REPLACE INTO', 'UPSERT',
]

/**
 * ตรวจสอบ SQL ว่าเป็น SELECT / read-only เท่านั้น
 * @returns cleaned query if safe, throws Error if dangerous
 */
export function sanitizeQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim()
  const upper = trimmed.toUpperCase()

  // ต้องเริ่มต้นด้วย SELECT หรือ WITH (CTE)
  if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
    throw new Error('❌ อนุญาตเฉพาะคำสั่ง SELECT เท่านั้นค่ะ')
  }

  // ตรวจ blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    // Match ที่เป็น word boundary เพื่อไม่ให้ false positive กับชื่อ column
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(trimmed)) {
      throw new Error(`❌ ไม่อนุญาตให้ใช้คำสั่ง ${keyword} ค่ะ — ระบบ read-only เท่านั้น`)
    }
  }

  // ป้องกัน multi-statement (semicolons)
  if (trimmed.includes(';')) {
    throw new Error('❌ ไม่อนุญาตให้ใช้ semicolon ค่ะ — อนุญาตเฉพาะ query เดียว')
  }

  // ป้องกัน comment injection
  if (trimmed.includes('--') || trimmed.includes('/*')) {
    throw new Error('❌ ไม่อนุญาตให้ใช้ SQL comments ค่ะ')
  }

  return trimmed
}

// ─── Query Functions (all read-only) ───────────────────────────────

/** สรุปยอดขายตามช่วงเวลาและช่องทาง */
export async function getSalesSummary(args: {
  startDate?: string
  endDate?: string
  channelId?: string
}) {
  const { startDate, endDate, channelId } = args
  const now = new Date()
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const where: any = {
    soldAt: { gte: start, lte: end },
    status: 'active',
  }
  if (channelId) where.channelId = channelId

  const sales = await db.sale.findMany({
    where,
    select: {
      id: true,
      billCode: true,
      totalAmount: true,
      discount: true,
      soldAt: true,
      paymentMethod: true,
      channel: {
        select: { name: true, code: true, type: true }
      },
      items: {
        select: {
          barcode: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          isFreebie: true,
          product: {
            select: { name: true, size: true, category: true }
          }
        }
      }
    },
    orderBy: { soldAt: 'desc' },
    take: 100,
  })

  const totalSales = sales.length
  const totalAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0)
  const totalDiscount = sales.reduce((sum, s) => sum + Number(s.discount), 0)
  const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0)

  // แยกตาม channel
  const byChannel: Record<string, { name: string; count: number; amount: number }> = {}
  for (const sale of sales) {
    const chName = sale.channel?.name || 'ไม่ระบุ'
    if (!byChannel[chName]) byChannel[chName] = { name: chName, count: 0, amount: 0 }
    byChannel[chName].count++
    byChannel[chName].amount += Number(sale.totalAmount)
  }

  // แยกตาม paymentMethod
  const byPayment: Record<string, { count: number; amount: number }> = {}
  for (const sale of sales) {
    const pm = sale.paymentMethod || 'cash'
    if (!byPayment[pm]) byPayment[pm] = { count: 0, amount: 0 }
    byPayment[pm].count++
    byPayment[pm].amount += Number(sale.totalAmount)
  }

  return {
    period: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      totalBills: totalSales,
      totalAmount: totalAmount.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      netAmount: (totalAmount - totalDiscount).toFixed(2),
      totalItems,
    },
    byChannel: Object.values(byChannel).sort((a, b) => b.amount - a.amount),
    byPaymentMethod: Object.entries(byPayment).map(([method, data]) => ({
      method,
      ...data,
      amount: data.amount.toFixed(2),
    })),
  }
}

/** เช็คสต็อกคลัง/ช่องทาง */
export async function getStockStatus(args: {
  barcode?: string
  productName?: string
  channelId?: string
}) {
  const { barcode, productName, channelId } = args

  if (barcode) {
    // ค้นหาตาม barcode เฉพาะ
    const warehouseStock = await db.warehouseStock.findUnique({
      where: { barcode },
      select: {
        barcode: true,
        quantity: true,
        reservedQuantity: true,
        product: { select: { name: true, size: true, price: true, category: true } }
      }
    })

    const channelStocks = await db.channelStock.findMany({
      where: { barcode },
      select: {
        quantity: true,
        soldQuantity: true,
        returnedQuantity: true,
        channel: { select: { name: true, code: true, type: true } }
      }
    })

    return {
      barcode,
      product: warehouseStock?.product || null,
      warehouse: warehouseStock ? {
        quantity: warehouseStock.quantity,
        reserved: warehouseStock.reservedQuantity,
        available: warehouseStock.quantity - warehouseStock.reservedQuantity,
      } : null,
      channels: channelStocks.map(cs => ({
        channel: cs.channel.name,
        type: cs.channel.type,
        quantity: cs.quantity,
        sold: cs.soldQuantity,
        returned: cs.returnedQuantity,
        remaining: cs.quantity - cs.soldQuantity,
      })),
    }
  }

  if (productName) {
    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: productName, mode: 'insensitive' } },
          { code: { contains: productName, mode: 'insensitive' } },
          { barcode: { contains: productName, mode: 'insensitive' } },
        ]
      },
      select: {
        barcode: true,
        name: true,
        size: true,
        price: true,
        category: true,
        warehouseStock: {
          select: { quantity: true, reservedQuantity: true }
        }
      },
      take: 20,
    })

    return {
      searchTerm: productName,
      results: products.map(p => ({
        barcode: p.barcode,
        name: p.name,
        size: p.size,
        price: p.price ? Number(p.price) : null,
        category: p.category,
        warehouseQty: p.warehouseStock?.quantity || 0,
        warehouseAvailable: (p.warehouseStock?.quantity || 0) - (p.warehouseStock?.reservedQuantity || 0),
      })),
    }
  }

  // ถ้าไม่ระบุอะไรเลย → สรุปภาพรวมสต็อกคลัง
  const warehouseTotal = await db.warehouseStock.aggregate({
    _sum: { quantity: true, reservedQuantity: true },
    _count: true,
  })

  return {
    warehouseSummary: {
      totalSKUs: warehouseTotal._count,
      totalQuantity: warehouseTotal._sum.quantity || 0,
      totalReserved: warehouseTotal._sum.reservedQuantity || 0,
      totalAvailable: (warehouseTotal._sum.quantity || 0) - (warehouseTotal._sum.reservedQuantity || 0),
    }
  }
}

/** ดูข้อมูลงานอีเว้นท์/สาขา */
export async function getChannelInfo(args: {
  keyword?: string
  type?: string
  status?: string
}) {
  const { keyword, type, status } = args

  const where: any = { isActive: true }
  if (type) where.type = type.toUpperCase()
  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { code: { contains: keyword, mode: 'insensitive' } },
      { location: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  const channels = await db.salesChannel.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      location: true,
      startDate: true,
      endDate: true,
      status: true,
      salesTarget: true,
      responsiblePersonName: true,
      phone: true,
    },
    orderBy: { startDate: 'desc' },
    take: 20,
  })

  return {
    totalChannels: channels.length,
    channels: channels.map(ch => ({
      code: ch.code,
      name: ch.name,
      type: ch.type,
      location: ch.location,
      startDate: ch.startDate?.toISOString().split('T')[0] || null,
      endDate: ch.endDate?.toISOString().split('T')[0] || null,
      status: ch.status,
      salesTarget: ch.salesTarget ? Number(ch.salesTarget) : null,
      responsiblePerson: ch.responsiblePersonName || null,
      phone: ch.phone || null,
    })),
  }
}

/** ดูข้อมูลพนักงาน (ไม่รวมเงินเดือน/ข้อมูลส่วนตัว) */
export async function getStaffInfo(args: {
  keyword?: string
  role?: string
}) {
  const { keyword, role } = args

  const where: any = { status: 'active' }
  if (role) where.role = role.toUpperCase()
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { code: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  const staffList = await db.staff.findMany({
    where,
    select: {
      code: true,
      name: true,
      role: true,
      position: true,
      employeeType: true,
      phone: true,
      status: true,
    },
    orderBy: { name: 'asc' },
    take: 30,
  })

  return {
    totalStaff: staffList.length,
    staff: staffList.map(s => ({
      code: s.code,
      name: s.name,
      role: s.role,
      position: s.position || null,
      employeeType: s.employeeType || null,
      // เบอร์โทรแสดงเฉพาะ 4 ตัวท้าย
      phone: s.phone ? `***-${s.phone.slice(-4)}` : null,
    })),
  }
}

/** ดูข้อมูลลูกค้า */
export async function getCustomerInfo(args: { keyword?: string }) {
  const { keyword } = args

  const where: any = { status: 'active' }
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { code: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  const customers = await db.customer.findMany({
    where,
    select: {
      code: true,
      name: true,
      phone: true,
      creditTerm: true,
      discountPercent: true,
    },
    take: 20,
  })

  return {
    total: customers.length,
    customers: customers.map(c => ({
      code: c.code,
      name: c.name,
      phone: c.phone ? `***-${c.phone.slice(-4)}` : null,
      creditTerm: c.creditTerm || 0,
      discountPercent: c.discountPercent ? Number(c.discountPercent) : 0,
    })),
  }
}

/** ดูข้อมูลใบแจ้งหนี้/Invoice */
export async function getInvoiceInfo(args: {
  channelId?: string
  status?: string
  invoiceNumber?: string
}) {
  const { channelId, status, invoiceNumber } = args

  const where: any = {}
  if (channelId) where.channelId = channelId
  if (status) where.status = status
  if (invoiceNumber) where.invoiceNumber = { contains: invoiceNumber }

  const invoices = await db.invoice.findMany({
    where,
    select: {
      invoiceNumber: true,
      totalQuantity: true,
      totalAmount: true,
      discountAmount: true,
      grandTotal: true,
      status: true,
      invoiceDate: true,
      channel: { select: { name: true, code: true } },
      customer: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return {
    total: invoices.length,
    invoices: invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      channelName: inv.channel?.name || null,
      customerName: inv.customer?.name || null,
      totalQuantity: inv.totalQuantity,
      totalAmount: Number(inv.totalAmount),
      discountAmount: Number(inv.discountAmount),
      grandTotal: Number(inv.grandTotal),
      status: inv.status,
      invoiceDate: inv.invoiceDate?.toISOString().split('T')[0] || null,
    })),
  }
}

/** สินค้าขายดี (Top selling products) */
export async function getTopProducts(args: {
  startDate?: string
  endDate?: string
  channelId?: string
  limit?: number
}) {
  const { startDate, endDate, channelId, limit = 10 } = args
  const now = new Date()
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : now

  // Use raw query for aggregation
  const query = `
    SELECT 
      si.barcode,
      p.name as product_name,
      p.size,
      p.category,
      CAST(p.price AS NUMERIC) as unit_price,
      SUM(si.quantity) as total_quantity,
      CAST(SUM(si.total_amount) AS NUMERIC) as total_amount
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    JOIN products p ON si.barcode = p.barcode
    WHERE s.sold_at >= $1 AND s.sold_at <= $2
      AND s.status = 'active'
      AND si.is_freebie = false
      ${channelId ? `AND s.channel_id = '${channelId}'` : ''}
    GROUP BY si.barcode, p.name, p.size, p.category, p.price
    ORDER BY total_quantity DESC
    LIMIT ${Math.min(limit, 50)}
  `

  try {
    const results = await db.$queryRawUnsafe(query, start, end) as any[]
    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      topProducts: results.map((r, i) => ({
        rank: i + 1,
        barcode: r.barcode,
        name: r.product_name,
        size: r.size,
        category: r.category,
        unitPrice: Number(r.unit_price || 0),
        totalQuantitySold: Number(r.total_quantity),
        totalAmount: Number(r.total_amount || 0),
      })),
    }
  } catch (err: any) {
    return { error: `Query failed: ${err.message}` }
  }
}

/** รัน custom SELECT query (read-only enforced) */
export async function runReadOnlyQuery(args: { sqlQuery: string }) {
  const sanitized = sanitizeQuery(args.sqlQuery) // จะ throw ถ้าไม่ safe
  try {
    const results = await db.$queryRawUnsafe(sanitized) as any[]
    // จำกัดผลลัพธ์ไม่เกิน 50 rows
    const limited = results.slice(0, 50)
    return {
      rowCount: results.length,
      displayedRows: limited.length,
      data: limited,
    }
  } catch (err: any) {
    return { error: `Query failed: ${err.message}` }
  }
}

// ─── Export function map for Gemini ────────────────────────────────

export const botFunctions: Record<string, (args: any) => Promise<any>> = {
  getSalesSummary,
  getStockStatus,
  getChannelInfo,
  getStaffInfo,
  getCustomerInfo,
  getInvoiceInfo,
  getTopProducts,
  runReadOnlyQuery,
}
