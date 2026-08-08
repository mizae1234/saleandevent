import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const search = url.searchParams.get('search') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { lineUserId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await db.lineUser.findMany({
      where,
      orderBy: { lastActiveAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('[LineUsers API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { lineUserId, role, isActive } = body

    if (!lineUserId) {
      return NextResponse.json({ error: 'lineUserId required' }, { status: 400 })
    }

    const data: any = {}
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive

    const updated = await db.lineUser.update({
      where: { lineUserId },
      data,
    })

    return NextResponse.json({ user: updated })
  } catch (error: any) {
    console.error('[LineUsers PATCH Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
