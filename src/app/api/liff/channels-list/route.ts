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
        code: true,
        name: true,
        type: true,
        location: true,
        startDate: true,
        endDate: true,
        salesTarget: true,
        responsiblePersonName: true,
        phone: true,
      },
      orderBy: { startDate: 'desc' }
    })

    const formatted = activeChannels.map(ch => ({
      id: ch.id,
      code: ch.code,
      name: ch.name,
      type: ch.type,
      location: ch.location,
      startDate: ch.startDate ? ch.startDate.toISOString().split('T')[0] : null,
      endDate: ch.endDate ? ch.endDate.toISOString().split('T')[0] : null,
      salesTarget: Number(ch.salesTarget || 0),
      responsiblePersonName: ch.responsiblePersonName,
      phone: ch.phone,
    }))

    return NextResponse.json(formatted)
  } catch (error: any) {
    console.error('[LIFF Channels List API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
