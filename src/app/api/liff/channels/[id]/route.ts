import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSalesSummary } from '@/lib/bot-queries'

export const dynamic = 'force-dynamic'

async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const idToken = authHeader.substring(7)
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) return null

  try {
    const res = await fetch(`https://api.line.me/oauth2/v2.1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: liffId.split('-')[0]
      })
    })

    if (!res.ok) return null
    const data = await res.json()
    if (!data.sub) return null

    // แค่ verify LIFF token ผ่านก็ OK (ไม่ต้อง check user ใน DB)
    return { lineUserId: data.sub, displayName: data.name }
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: channelId } = await params

  try {
    const channel = await db.salesChannel.findUnique({
      where: { id: channelId }
    })

    if (!channel || !channel.isActive) {
      return NextResponse.json({ error: 'Channel not found or inactive' }, { status: 404 })
    }

    const staffAssignments = await db.channelStaff.findMany({
      where: { channelId },
      include: {
        staff: {
          select: { id: true, code: true, name: true, role: true, position: true, phone: true }
        }
      }
    })

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    const attendance = await db.attendance.findMany({
      where: {
        channelId,
        date: { gte: todayStart, lte: todayEnd }
      },
      select: { staffId: true, hoursWorked: true }
    })

    const checkedInStaffIds = new Set(attendance.map(a => a.staffId))

    const staffList = staffAssignments.map((sa: any) => ({
      id: sa.staff.id,
      code: sa.staff.code,
      name: sa.staff.name,
      role: sa.staff.role,
      position: sa.staff.position,
      phone: sa.staff.phone,
      isCheckedIn: checkedInStaffIds.has(sa.staff.id)
    }))

    const todayStr = today.toISOString().split('T')[0]
    const salesSummary = await getSalesSummary({
      startDate: todayStr,
      endDate: todayStr,
      channelId
    })

    // ── ยอดขายรวมทั้งหมดของช่องทางนี้ ──
    const totalSalesAgg = await db.sale.aggregate({
      where: { channelId, status: 'active' },
      _sum: { totalAmount: true },
      _count: true
    })

    // ── สต็อกคงเหลือ (summary + detail) ──
    const channelStockData = await db.channelStock.findMany({
      where: { channelId },
      include: {
        product: { select: { barcode: true, name: true, code: true, size: true, price: true } }
      },
      orderBy: { product: { name: 'asc' } }
    })
    const totalReceived = channelStockData.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0)
    const totalSold = channelStockData.reduce((sum: number, s: any) => sum + (s.soldQuantity || 0), 0)
    const totalReturned = channelStockData.reduce((sum: number, s: any) => sum + (s.returnedQuantity || 0), 0)
    const stockRemaining = totalReceived - totalSold - totalReturned

    const stockDetail = channelStockData
      .map((s: any) => ({
        barcode: s.barcode,
        name: s.product?.name || s.barcode,
        code: s.product?.code || '-',
        size: s.product?.size || '-',
        received: s.quantity || 0,
        sold: s.soldQuantity || 0,
        returned: s.returnedQuantity || 0,
        remaining: (s.quantity || 0) - (s.soldQuantity || 0) - (s.returnedQuantity || 0)
      }))
      .filter((s: any) => s.remaining > 0)
      .sort((a: any, b: any) => b.remaining - a.remaining)

    // ── สินค้าขายดี Top 5 ──
    const topProducts = await db.saleItem.groupBy({
      by: ['barcode'],
      where: { sale: { channelId, status: 'active' } },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    })

    let topProductsWithNames: any[] = []
    if (topProducts.length > 0) {
      const barcodes = topProducts.map((p: any) => p.barcode)
      const products = await db.product.findMany({
        where: { barcode: { in: barcodes } },
        select: { barcode: true, name: true, code: true, size: true, price: true }
      })
      const productMap = new Map(products.map((p: any) => [p.barcode, p]))
      topProductsWithNames = topProducts.map((p: any) => {
        const prod = productMap.get(p.barcode)
        return {
          barcode: p.barcode,
          name: prod?.name || p.barcode,
          code: prod?.code || '-',
          size: prod?.size || '-',
          price: prod?.price ? Number(prod.price) : 0,
          totalQty: p._sum.quantity || 0,
          totalAmount: p._sum.totalAmount ? Number(p._sum.totalAmount) : 0
        }
      })
    }

    return NextResponse.json({
      channel: {
        id: channel.id,
        code: channel.code,
        name: channel.name,
        type: channel.type,
        location: channel.location,
        startDate: channel.startDate?.toISOString().split('T')[0] || null,
        endDate: channel.endDate?.toISOString().split('T')[0] || null,
        status: channel.status,
        salesTarget: channel.salesTarget ? Number(channel.salesTarget) : 0,
        responsiblePersonName: channel.responsiblePersonName,
        phone: channel.phone
      },
      staff: staffList,
      sales: salesSummary,
      totalSales: {
        amount: totalSalesAgg._sum.totalAmount ? Number(totalSalesAgg._sum.totalAmount) : 0,
        billCount: totalSalesAgg._count || 0
      },
      stock: {
        received: totalReceived,
        sold: totalSold,
        returned: totalReturned,
        remaining: stockRemaining,
        detail: stockDetail
      },
      topProducts: topProductsWithNames
    })
  } catch (error: any) {
    console.error('[LIFF Channel Details API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
