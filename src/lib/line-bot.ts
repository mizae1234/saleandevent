import { Client, middleware } from '@line/bot-sdk'
import crypto from 'crypto'

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
}

export const lineClient = new Client(lineConfig)
export const lineMiddleware = middleware(lineConfig)

/**
 * ตรวจสอบ Line Signature ว่า request มาจาก Line Platform จริง
 */
export function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', lineConfig.channelSecret)
    .update(body)
    .digest('base64')
  return hash === signature
}
