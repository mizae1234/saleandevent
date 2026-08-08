import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json()
    if (!idToken) {
      return NextResponse.json({ error: 'ID Token is required' }, { status: 400 })
    }

    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
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

    if (!lineData.sub) {
      return NextResponse.json({ error: 'ไม่พบ LINE User ID' }, { status: 401 })
    }

    // ตอนนี้แค่ verify LIFF token ผ่านก็ให้เข้าได้เลย (ไม่ต้อง check user ใน DB)
    // TODO: ในอนาคตจะ map LINE user กับ user ในระบบ
    return NextResponse.json({
      success: true,
      user: {
        displayName: lineData.name || 'LINE User',
        pictureUrl: lineData.picture || null,
        role: 'USER'
      }
    })
  } catch (err: any) {
    console.error('[Liff Login API Error]', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 })
  }
}
