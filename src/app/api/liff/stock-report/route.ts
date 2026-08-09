import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    return { lineUserId: data.sub, displayName: data.name }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const activeChannels = await db.salesChannel.findMany({
      where: { status: 'active', isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        stock: {
          select: {
            barcode: true,
            quantity: true,
            soldQuantity: true,
            returnedQuantity: true,
            product: {
              select: {
                name: true,
                code: true,
                size: true,
                price: true,
                category: true,
              }
            }
          }
        }
      }
    })

    let totalQuantity = 0
    let totalSold = 0
    let totalRemaining = 0

    const channelStocks = activeChannels.map(ch => {
      let chQty = 0
      let chSold = 0
      let chRemaining = 0
      const items = ch.stock.map(s => {
        const remaining = Math.max(0, s.quantity - s.soldQuantity - s.returnedQuantity)
        chQty += s.quantity
        chSold += s.soldQuantity
        chRemaining += remaining
        return {
          barcode: s.barcode,
          name: s.product.name,
          code: s.product.code,
          size: s.product.size,
          price: Number(s.product.price || 0),
          category: s.product.category,
          quantity: s.quantity,
          sold: s.soldQuantity,
          remaining: remaining,
        }
      })

      totalQuantity += chQty
      totalSold += chSold
      totalRemaining += chRemaining

      return {
        id: ch.id,
        name: ch.name,
        code: ch.code,
        type: ch.type,
        summary: {
          quantity: chQty,
          sold: chSold,
          remaining: chRemaining,
        },
        items,
      }
    })

    return NextResponse.json({
      summary: {
        totalQuantity,
        totalSold,
        totalRemaining,
        channelCount: activeChannels.length,
      },
      channels: channelStocks,
    })
  } catch (error: any) {
    console.error('[LIFF Stock Report API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
