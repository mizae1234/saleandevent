import { Client, middleware } from '@line/bot-sdk'
import crypto from 'crypto'

/**
 * Line Bot Client — lazy initialized
 * ใช้ getter function เพื่อไม่ให้ crash ตอน Docker build (ที่ยังไม่มี env)
 */

let _lineClient: Client | null = null
let _lineMiddleware: ReturnType<typeof middleware> | null = null

function getConfig() {
  return {
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  }
}

export function getLineClient(): Client {
  if (!_lineClient) {
    _lineClient = new Client(getConfig())
  }
  return _lineClient
}

// Keep backward-compatible export
export const lineClient = new Proxy({} as Client, {
  get(_, prop) {
    return (getLineClient() as any)[prop]
  },
})

export function getLineMiddleware() {
  if (!_lineMiddleware) {
    _lineMiddleware = middleware(getConfig())
  }
  return _lineMiddleware
}

/**
 * ตรวจสอบ Line Signature ว่า request มาจาก Line Platform จริง
 */
export function verifySignature(body: string, signature: string): boolean {
  const config = getConfig()
  const hash = crypto
    .createHmac('sha256', config.channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}
