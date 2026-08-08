/**
 * LIFF Authentication Utilities
 * Centralized LIFF ID token verification for all LIFF API routes
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

/** Get the configured LIFF ID from environment variables */
export function getLiffId(): string {
  return process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
}

/**
 * Verify LIFF ID token and return the authenticated LineUser
 * Returns null if authentication fails or user is not authorized
 */
export async function verifyLiffAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const idToken = authHeader.substring(7)
  const liffId = getLiffId()
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
    const lineUserId = data.sub

    const user = await db.lineUser.findUnique({
      where: { lineUserId }
    })

    if (!user || !user.isActive) return null
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN']
    if (!allowedRoles.includes(user.role)) return null

    return user
  } catch {
    return null
  }
}
