import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate') || undefined
    const endDate = url.searchParams.get('endDate') || undefined
    const channelId = url.searchParams.get('channelId') || undefined

    const summary = await getSalesSummary({ startDate, endDate, channelId })
    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('[LIFF Sales Summary API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
