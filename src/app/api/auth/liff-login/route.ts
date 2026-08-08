import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    if (!idToken) {
      return NextResponse.json({ error: 'ID Token is required' }, { status: 400 })
    }

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) {
      return NextResponse.json({ error: 'LIFF ID is not configured' }, { status: 500 })
    }

    const verifyUrl = `https://api.line.me/oauth2/v2.1/verify`
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: liffId.split('-')[0]
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[LINE Verification Failed]', errText)
      return NextResponse.json({ error: 'การยืนยันตัวตนกับ LINE ล้มเหลว' }, { status: 401 })
    }

    const lineData = await res.json()
    const lineUserId = lineData.sub

    if (!lineUserId) {
      return NextResponse.json({ error: 'ไม่พบ LINE User ID' }, { status: 401 })
    }

    const user = await db.lineUser.findUnique({
      where: { lineUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้ LINE นี้ในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์' }, { status: 403 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งานชั่วคราว' }, { status: 403 })
    }

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าใช้งานหน้ารายงานสรุป' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      user: {
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        role: user.role
      }
    })
  } catch (err: any) {
    console.error('[Liff Login API Error]', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 })
  }
}
