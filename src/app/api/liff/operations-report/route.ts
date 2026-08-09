import { NextRequest, NextResponse } from 'next/server'
import { getOperationsReport } from '@/lib/bot-queries'

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
    const reportData = await getOperationsReport()
    return NextResponse.json(reportData)
  } catch (error: any) {
    console.error('[LIFF Operations Report API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
