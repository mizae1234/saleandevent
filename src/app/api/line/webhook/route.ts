import { NextRequest, NextResponse } from 'next/server'
import { lineClient, verifySignature } from '@/lib/line-bot'
import { askSaran } from '@/lib/gemini-bot'
import { logChatToDb, getRecentChatHistory } from '@/lib/chat-log'
import { getOrCreateLineUser, isUserAllowed, isAdmin } from '@/lib/line-user'
import { registerGroup, markGroupLeft, updateGroupActivity } from '@/lib/line-group'
import type { WebhookEvent } from '@line/bot-sdk'
import { db } from '@/lib/db'
import { getSalesSummary, getOverviewReport, getOperationsReport } from '@/lib/bot-queries'
import {
  QUICK_REPLY_ITEMS,
  getMenuFlexMessage,
  getSalesSummaryFlexMessage,
  getActiveEventsFlexMessage,
  getOverviewReportFlexMessage,
  getOperationsReportFlexMessage
} from '@/lib/line-flex'

export const dynamic = 'force-dynamic'

// ─── Constants ─────────────────────────────────────────────────────

const BOT_NAME = 'Saran'
const BOT_TRIGGERS = [
  '@saran assistant', '@saran',            // LINE @mention
  '@ซาร้าน', '@สาร้าน',                     // @mention ภาษาไทย
  'saran',                                  // ภาษาอังกฤษ
  'ซาร้าน', 'สาร้าน', 'ซาราน', 'สาราน',     // ภาษาไทยหลายแบบ
  'บอท', 'บอต', 'bot',                      // เรียกบอท
]

// QUICK_REPLY_ITEMS is now imported from '@/lib/line-flex'

// ─── Webhook POST Handler ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-line-signature') ?? ''

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { events }: { events: WebhookEvent[] } = JSON.parse(body)

    // Process events in background (Line webhook has 5-second timeout)
    Promise.allSettled(
      events.map(event => handleEvent(event))
    ).catch(err => {
      console.error('[Webhook Background Error]', err)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Webhook POST Error]', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// ─── Event Router ──────────────────────────────────────────────────

async function handleEvent(event: WebhookEvent) {
  const sourceType = event.source.type
  const isGroup = sourceType === 'group' || sourceType === 'room'
  const userId = event.source.userId

  // ─── Follow Event (user adds Line OA) ──────────────────────────
  if (event.type === 'follow' && userId) {
    // Auto-register user
    const user = await getOrCreateLineUser(userId)
    console.log(`[Webhook] 👤 New follower: ${user.displayName} (${userId}), role: ${user.role}`)

    await replyText(
      event.replyToken,
      `สวัสดีค่ะ~ ${BOT_NAME} พร้อมช่วยเหลือเรื่องข้อมูลการขายและสต็อกสินค้าค่ะ 👖✨\n\nลองถามได้เลย เช่น:\n💬 "ยอดขายวันนี้"\n💬 "สต็อกสินค้า XXX"\n💬 "สินค้าขายดีเดือนนี้"\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมดค่ะ 💙`
    )
    return
  }

  // ─── Unfollow Event (user blocks/removes OA) ───────────────────
  if (event.type === 'unfollow') {
    console.log(`[Webhook] 👋 User unfollowed: ${userId}`)
    return
  }

  // ─── Join Event (bot added to group) ───────────────────────────
  if (event.type === 'join') {
    const groupId = (event.source as any).groupId
    if (groupId) {
      registerGroup(groupId).catch(err => console.error('[Webhook] Group register error:', err))
    }
    await replyText(
      event.replyToken,
      `สวัสดีค่ะ~ ${BOT_NAME} มาแล้วนะ 👖✨\n\nเรียก ${BOT_NAME} ได้โดยพิมพ์ชื่อนำหน้า เช่น:\n💬 "saran ยอดขายวันนี้"\n💬 "saran สต็อกเหลือเท่าไหร่"\n\nพิมพ์ "saran เมนู" เพื่อดูคำสั่งทั้งหมดค่ะ 💙`
    )
    return
  }

  // ─── Leave Event (bot removed from group) ──────────────────────
  if (event.type === 'leave') {
    const groupId = (event.source as any).groupId
    if (groupId) {
      markGroupLeft(groupId).catch(err => console.error('[Webhook] Group leave error:', err))
    }
    return
  }

  // ─── Non-text Messages ─────────────────────────────────────────
  if (event.type !== 'message' || event.message.type !== 'text') {
    if (!isGroup && event.type === 'message' && 'replyToken' in event) {
      if (event.message.type === 'sticker') {
        await replyText(event.replyToken, `${BOT_NAME} เห็นสติกเกอร์น่ารักแล้วนะ 👖✨`)
      } else if (event.message.type === 'image' || event.message.type === 'video') {
        await replyText(event.replyToken, `${BOT_NAME} รับรูป/วิดีโอไว้แล้วนะคะ 📸 ถ้ามีอะไรให้ช่วยพิมพ์บอกได้เลยค่ะ~`)
      }
    }
    return
  }

  // ─── Text Message Handling ─────────────────────────────────────
  const rawText = event.message.text.trim()
  const rawLower = rawText.toLowerCase()

  // Register/update user & check permission
  let userRole = 'USER'
  if (userId) {
    const user = await getOrCreateLineUser(userId)
    userRole = user.role

    if (!isUserAllowed(user)) {
      await replyText(
        event.replyToken,
        `ขออภัยค่ะ 🙏 คุณไม่มีสิทธิ์ใช้งาน ${BOT_NAME} ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบค่ะ`
      )
      return
    }
  }

  // ─── Group Mode: require bot trigger prefix ────────────────────
  if (isGroup) {
    // อัพเดท group activity (async)
    const groupId = (event.source as any).groupId || (event.source as any).roomId
    if (groupId) {
      updateGroupActivity(groupId).catch(() => {})
    }

    const bypassKeywords = [
      'ยอดขายวันนี้', 'สรุปสต็อกคลัง', 'งานอีเว้นท์ที่เปิดอยู่',
      'สินค้าขายดีเดือนนี้', 'เมนู', 'อีเว้นท์', 'สาขา',
      'event', 'events', 'store', 'stores', 'ยอดขาย',
    ]
    const isBypass = bypassKeywords.some(kw => rawLower === kw || rawLower.startsWith(kw + ' '))

    let strippedText = rawText
    let triggerFound = false

    if (isBypass) {
      strippedText = rawText
      triggerFound = true
    } else {
      const trigger = BOT_TRIGGERS.find(t => rawLower.startsWith(t))
      if (trigger) {
        strippedText = rawText.substring(trigger.length).trim()
        triggerFound = true
      }
    }

    if (!triggerFound) return

    if (!isBypass && !strippedText) {
      await replyText(
        event.replyToken,
        `ว่าไงคะ~ 👖✨ ${BOT_NAME} พร้อมช่วยเหลือแล้วค่ะ!\n\nลองถาม เช่น:\n💬 "saran ยอดขายวันนี้"\n💬 "saran เมนู" 💙`
      )
      return
    }

    await handleChat(strippedText, userId!, event.replyToken, sourceType, getSourceId(event), userRole)
    return
  }

  // ─── DM Mode: respond to all messages ──────────────────────────
  let text = rawText
  const dmTrigger = BOT_TRIGGERS.find(t => rawLower.startsWith(t))
  if (dmTrigger && rawText.length > dmTrigger.length) {
    text = rawText.substring(dmTrigger.length).trim()
  }

  await handleChat(text, userId!, event.replyToken, sourceType, getSourceId(event), userRole)
}

// ─── Chat Handler ──────────────────────────────────────────────────

async function handleChat(
  text: string,
  userId: string,
  replyToken: string,
  sourceType: string,
  sourceId: string | null,
  userRole: string = 'USER',
) {
  const lower = text.toLowerCase()

  // ─── Menu Command ──────────────────────────────────────────────
  if (matchAny(lower, ['เมนู', 'menu', 'help', 'คำสั่ง'])) {
    await replyFlex(replyToken, getMenuFlexMessage())
    return
  }

  // ─── LINE User ID Command ─────────────────────────────────────
  if (matchAny(lower, ['my id', 'line id', 'my line id'])) {
    await replyText(replyToken, `🆔 LINE User ID ของคุณคือ:\n\`${userId}\` 💙`)
    return
  }

  // ─── Sales Summary Command ──────────────────────────────────────
  if (lower === 'ยอดขายวันนี้' || lower === 'สรุปยอดขายวันนี้' || lower === 'ยอดขาย') {
    try {
      const summary = await getSalesSummary({})
      const flexMsg = getSalesSummaryFlexMessage(summary)
      await replyFlex(replyToken, flexMsg)
      return
    } catch (err) {
      console.error('[Webhook Sales Summary Error]', err)
      await replyText(replyToken, 'ขออภัยค่ะ 😢 เกิดข้อผิดพลาดในการดึงข้อมูลยอดขาย')
      return
    }
  }

  // ─── Overview Report Command ────────────────────────────────────
  if (matchAny(lower, ['ภาพรวม', 'สรุปภาพรวม', 'overview'])) {
    try {
      const summary = await getOverviewReport()
      if ('error' in summary) {
        throw new Error(summary.error)
      }
      const flexMsg = getOverviewReportFlexMessage(summary)
      await replyFlex(replyToken, flexMsg)
      return
    } catch (err) {
      console.error('[Webhook Overview Report Error]', err)
      await replyText(replyToken, 'ขออภัยค่ะ 😢 เกิดข้อผิดพลาดในการดึงข้อมูลรายงานภาพรวม')
      return
    }
  }

  // ─── Operations Report Command ──────────────────────────────────
  if (matchAny(lower, ['ดำเนินงาน', 'รายงานการดำเนินงาน', 'operations'])) {
    try {
      const reportData = await getOperationsReport()
      if ('error' in reportData) {
        throw new Error(reportData.error)
      }
      const flexMsg = getOperationsReportFlexMessage(reportData)
      await replyFlex(replyToken, flexMsg)
      return
    } catch (err) {
      console.error('[Webhook Operations Report Error]', err)
      await replyText(replyToken, 'ขออภัยค่ะ 😢 เกิดข้อผิดพลาดในการดึงข้อมูลรายงานการดำเนินงาน')
      return
    }
  }

  // ─── Active Events Command ──────────────────────────────────────
  const eventKeywords = ['งานอีเว้นท์ที่เปิดอยู่', 'อีเว้นท์', 'event', 'events', 'store', 'stores']
  const isEventCommand = eventKeywords.some(kw => lower === kw || lower.startsWith(kw + ' ')) 
    || lower === 'สาขา' || lower.startsWith('สาขา ')
  if (isEventCommand) {
    try {
      const searchKeyword = text.replace(/^(งานอีเว้นท์ที่เปิดอยู่|อีเว้นท์|สาขา|events?|stores?)\s*/i, '').trim()
      
      const where: any = { status: 'active', isActive: true }
      if (searchKeyword) {
        where.OR = [
          { name: { contains: searchKeyword, mode: 'insensitive' } },
          { code: { contains: searchKeyword, mode: 'insensitive' } },
          { location: { contains: searchKeyword, mode: 'insensitive' } }
        ]
      }

      const activeChannels = await db.salesChannel.findMany({
        where,
        orderBy: { startDate: 'desc' }
      })

      if (activeChannels.length === 0) {
        if (searchKeyword) {
          await replyText(replyToken, `ไม่พบบูธหรือสาขาที่ตรงกับ "${searchKeyword}" ที่เปิดอยู่ตอนนี้ค่ะ 🏪`)
        } else {
          await replyText(replyToken, 'ช่วงนี้ไม่มีงานอีเว้นท์หรือสาขาที่เปิดอยู่ค่ะ 🏪')
        }
        return
      }

      // ถ้าระบุชื่อ → แสดง Flex ให้กดดูรายละเอียด
      if (searchKeyword && activeChannels.length <= 3) {
        const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
        
        const buildChannelBox = (ch: any) => {
          const fmt = (d: any) => d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'
          const target = ch.salesTarget ? `฿${Number(ch.salesTarget).toLocaleString()}` : '-'
          
          const contents: any[] = [
            { type: 'text', text: `${ch.type === 'EVENT' ? '📍' : '🏬'} ${ch.name}`, weight: 'bold', size: 'md', wrap: true },
            { type: 'text', text: `${ch.code}`, size: 'xxs', color: '#aaaaaa', margin: 'xs' },
            { type: 'separator', margin: 'md' },
            { type: 'text', text: `📌 สถานที่: ${ch.location || '-'}`, size: 'xs', color: '#555555', wrap: true, margin: 'md' },
            { type: 'text', text: `📅 วันที่: ${fmt(ch.startDate)} - ${fmt(ch.endDate)}`, size: 'xs', color: '#555555', margin: 'sm' },
            { type: 'text', text: `🎯 เป้ายอดขาย: ${target}`, size: 'xs', color: '#555555', margin: 'sm' },
          ]

          if (ch.responsiblePersonName) {
            contents.push({ type: 'text', text: `👤 ผู้รับผิดชอบ: ${ch.responsiblePersonName}`, size: 'xs', color: '#555555', margin: 'sm' })
          }

          contents.push({
            type: 'button',
            action: { type: 'uri', label: '📊 ดูรายละเอียดเพิ่มเติม', uri: `https://liff.line.me/${liffId}/channels/${ch.id}` },
            style: 'primary',
            color: '#0d9488',
            height: 'sm',
            margin: 'lg'
          })

          return contents
        }

        const flexMsg = {
          type: 'flex' as const,
          altText: `🏪 ค้นหาบูธ: ${searchKeyword}`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              contents: activeChannels.length === 1
                ? buildChannelBox(activeChannels[0])
                : activeChannels.flatMap((ch: any, i: number) => [
                    ...buildChannelBox(ch),
                    ...(i < activeChannels.length - 1 ? [{ type: 'separator', margin: 'lg' }] : [])
                  ])
            }
          },
          quickReply: QUICK_REPLY_ITEMS
        }
        await replyFlex(replyToken, flexMsg)
        return
      }

      // ไม่ระบุชื่อ หรือผลลัพธ์เยอะ → แสดง text list
      const header = searchKeyword
        ? `🔍 ค้นหา "${searchKeyword}" — พบ ${activeChannels.length} รายการ\n`
        : `🏪 งานอีเว้นท์/สาขาที่เปิดอยู่ (${activeChannels.length} รายการ)\n`

      const list = activeChannels.slice(0, 15).map((ch: any) => {
        const icon = ch.type === 'EVENT' ? '📍' : '🏬'
        return `${icon} ${ch.name}\n   📌 ${ch.location || '-'} | ${ch.code}`
      }).join('\n\n')

      const footer = activeChannels.length > 15 ? `\n\n... และอีก ${activeChannels.length - 15} รายการ` : ''

      await replyText(replyToken, `${header}\n${list}${footer}`)
      return
    } catch (err) {
      console.error('[Webhook Active Events Error]', err)
      await replyText(replyToken, 'ขออภัยค่ะ 😢 เกิดข้อผิดพลาดในการดึงข้อมูลสาขา')
      return
    }
  }

  // ─── AI Chat ───────────────────────────────────────────────────
  const startTime = Date.now()

  // ดึง chat history สำหรับ context
  const chatSourceId = sourceId || userId
  const history = await getRecentChatHistory(chatSourceId, 6)

  // ดึงชื่อผู้ใช้
  let userName: string | undefined
  try {
    const profile = await lineClient.getProfile(userId)
    userName = profile.displayName
  } catch { /* ignore */ }

  // ส่งคำถามให้ Gemini (พร้อม userRole สำหรับ privacy control)
  const response = await askSaran(text, history, userRole)
  const responseTimeMs = Date.now() - startTime

  // ตอบกลับผู้ใช้
  await replyText(replyToken, response.text)

  // บันทึก chat log (async, ไม่ block response)
  logChatToDb({
    sourceType,
    sourceId: chatSourceId,
    userName,
    userMessage: text,
    botReply: response.text,
    tokenData: {
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      modelName: response.modelName,
      responseTimeMs,
    },
  }).catch(err => console.error('[ChatLog Error]', err))
}

// ─── Helper Functions ──────────────────────────────────────────────

function getSourceId(event: WebhookEvent): string | null {
  if (event.source.type === 'group') return (event.source as any).groupId
  if (event.source.type === 'room') return (event.source as any).roomId
  return event.source.userId || null
}

function matchAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text === kw || text.includes(kw))
}

async function replyText(replyToken: string, text: string) {
  try {
    await lineClient.replyMessage(replyToken, {
      type: 'text',
      text,
      quickReply: QUICK_REPLY_ITEMS,
    } as any)
  } catch (err) {
    console.error('[replyText Error]', err)
  }
}

async function replyFlex(replyToken: string, flexMessage: any) {
  try {
    await lineClient.replyMessage(replyToken, flexMessage)
  } catch (err: any) {
    const detail = err?.originalError?.response?.data || err?.response?.data || err?.message || 'unknown'
    console.error('[replyFlex Error]', JSON.stringify(detail, null, 2))
    console.error('[replyFlex Flex Size]', JSON.stringify(flexMessage).length, 'bytes')
  }
}

// Helpers (menuRow, menuButton, getMenuFlexMessage) have been refactored to src/lib/line-flex.ts

// Flex Message Builders have been refactored to src/lib/line-flex.ts
