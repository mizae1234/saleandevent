import { NextRequest, NextResponse } from 'next/server'
import { lineClient, verifySignature } from '@/lib/line-bot'
import { askSaran } from '@/lib/gemini-bot'
import { logChatToDb, getRecentChatHistory } from '@/lib/chat-log'
import { getOrCreateLineUser, isUserAllowed, isAdmin } from '@/lib/line-user'
import { registerGroup, markGroupLeft, updateGroupActivity } from '@/lib/line-group'
import type { WebhookEvent } from '@line/bot-sdk'
import { db } from '@/lib/db'
import { getSalesSummary } from '@/lib/bot-queries'

export const dynamic = 'force-dynamic'

// ─── Constants ─────────────────────────────────────────────────────

const BOT_NAME = 'Saran'
const BOT_TRIGGERS = ['saran', 'ซาร้าน', 'สาร้าน']

const QUICK_REPLY_ITEMS = {
  items: [
    {
      type: 'action',
      action: { type: 'message', label: '📊 ยอดขายวันนี้', text: 'ยอดขายวันนี้' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📦 สต็อกคลัง', text: 'สรุปสต็อกคลัง' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '🏪 งานอีเว้นท์ที่เปิดอยู่', text: 'งานอีเว้นท์ที่เปิดอยู่' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '🏆 สินค้าขายดี', text: 'สินค้าขายดีเดือนนี้' },
    },
    {
      type: 'action',
      action: { type: 'message', label: '📖 เมนู', text: 'เมนู' },
    },
  ] as any[],
}

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
  if (matchAny(lower, ['ยอดขายวันนี้', 'ยอดขาย'])) {
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

  // ─── Active Events Command ──────────────────────────────────────
  if (matchAny(lower, ['งานอีเว้นท์ที่เปิดอยู่', 'อีเว้นท์', 'สาขา', 'event', 'events', 'store', 'stores'])) {
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

      const flexMsg = getActiveEventsFlexMessage(activeChannels, searchKeyword)
      await replyFlex(replyToken, flexMsg)
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
  } catch (err) {
    console.error('[replyFlex Error]', err)
  }
}

// ─── Menu Flex Message ─────────────────────────────────────────────

function getMenuFlexMessage() {
  return {
    type: 'flex' as const,
    altText: '📖 เมนูคำสั่ง Saran Bot',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📖 เมนูคำสั่ง',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
          {
            type: 'text',
            text: 'Saran Bot — ผู้ช่วย AI ข้อมูลการขายและสต็อก',
            size: 'xs',
            color: '#B3D4FC',
            margin: 'xs',
          },
        ],
        backgroundColor: '#1565C0',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '💡 วิธีใช้',
            weight: 'bold',
            size: 'sm',
            color: '#1565C0',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              menuRow('• แชทส่วนตัว:', 'พิมพ์ถามได้เลย ไม่ต้องใช้คำนำหน้า'),
              menuRow('• แชทกลุ่ม:', 'พิมพ์ "saran" นำหน้า เช่น "saran ยอดขาย"'),
            ],
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: '⚡ คำสั่งลัด',
            weight: 'bold',
            size: 'sm',
            color: '#1565C0',
            margin: 'sm',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              menuButton('1. ยอดขายวันนี้', 'ดูสรุปยอดขายและจำนวนบิล', 'ยอดขายวันนี้'),
              menuButton('2. สรุปสต็อกคลัง', 'ดูภาพรวมสินค้าคงเหลือ', 'สรุปสต็อกคลัง'),
              menuButton('3. งานอีเว้นท์ที่เปิดอยู่', 'ดูงานที่ active อยู่', 'งานอีเว้นท์ที่เปิดอยู่'),
              menuButton('4. สินค้าขายดี', 'สินค้ายอดขายสูงสุดเดือนนี้', 'สินค้าขายดีเดือนนี้'),
              menuRow('5. ค้นหาสินค้า [ชื่อ]', 'เช็คสต็อกสินค้าเฉพาะตัว'),
              menuRow('6. ยอดขาย [ชื่องาน]', 'ดูยอดขายเฉพาะช่องทาง'),
            ],
          },
        ],
        paddingAll: 'lg',
      },
    },
    quickReply: QUICK_REPLY_ITEMS,
  }
}

function menuRow(label: string, desc: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'xs', weight: 'bold', color: '#555555', flex: 4 },
      { type: 'text', text: desc, size: 'xs', color: '#666666', wrap: true, flex: 6 },
    ],
  }
}

function menuButton(label: string, desc: string, actionText: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    action: { type: 'message', label, text: actionText },
    contents: [
      { type: 'text', text: label, size: 'xs', weight: 'bold', color: '#1565C0', flex: 4 },
      { type: 'text', text: desc, size: 'xs', color: '#666666', flex: 6 },
    ],
  }
}

function getSalesSummaryFlexMessage(summary: any) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
  
  const paymentItems = (summary.byPaymentMethod || []).map((data: any) => {
    const method = data.method
    const methodName = method === 'cash' ? '💵 เงินสด' : method === 'transfer' ? '📱 โอนเงิน' : '💳 บัตรเครดิต'
    const amount = Number(data.amount)
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: methodName, size: 'xs', color: '#475569' },
        { type: 'text', text: `฿ ${amount.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`, size: 'xs', weight: 'bold', color: '#334155', align: 'end' }
      ]
    }
  })

  const totalAmount = Number(summary.summary.totalAmount)
  const totalBills = summary.summary.totalBills

  return {
    type: 'flex' as const,
    altText: '📊 สรุปยอดขายวันนี้',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปยอดขายวันนี้',
            weight: 'bold',
            size: 'md',
            color: '#ffffff'
          }
        ],
        backgroundColor: '#0284c7',
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'ยอดขายรวม',
                size: 'xs',
                color: '#64748b'
              },
              {
                type: 'text',
                text: '฿ ' + totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                weight: 'bold',
                size: 'xxl',
                color: '#0f172a',
                margin: 'xs'
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'จำนวนบิล',
                    size: 'xs',
                    color: '#64748b'
                  },
                  {
                    type: 'text',
                    text: totalBills + ' บิล',
                    weight: 'bold',
                    size: 'sm',
                    color: '#334155',
                    margin: 'xs'
                  }
                ],
                flex: 1
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'เฉลี่ย/บิล',
                    size: 'xs',
                    color: '#64748b'
                  },
                  {
                    type: 'text',
                    text: '฿ ' + (totalAmount / (totalBills || 1)).toLocaleString('th-TH', { maximumFractionDigits: 0 }),
                    weight: 'bold',
                    size: 'sm',
                    color: '#334155',
                    margin: 'xs'
                  }
                ],
                flex: 1
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'ช่องทางชำระเงิน',
                size: 'xs',
                color: '#64748b',
                weight: 'bold',
                margin: 'none'
              },
              ...paymentItems
            ]
          }
        ],
        paddingAll: 'lg'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดเพิ่มเติม (LIFF)',
              uri: `https://liff.line.me/${liffId}/sales`
            },
            style: "primary",
            color: "#0284c7"
          }
        ],
        paddingAll: 'lg'
      }
    },
    quickReply: QUICK_REPLY_ITEMS
  }
}

function getActiveEventsFlexMessage(channels: any[], keyword?: string) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID || process.env.NEXT_PUBLIC_LIFF_ID || ''
  
  const bubbles = channels.slice(0, 10).map((ch: any) => {
    return {
      type: 'bubble',
      size: 'micro',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🏪 ' + ch.name,
            weight: 'bold',
            size: 'sm',
            color: '#ffffff',
            wrap: true
          }
        ],
        backgroundColor: '#0d9488',
        paddingAll: 'sm'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          {
            type: 'text',
            text: 'รหัส: ' + ch.code,
            size: 'xxs',
            color: '#64748b'
          },
          {
            type: 'text',
            text: 'สถานที่: ' + (ch.location || '-'),
            size: 'xxs',
            color: '#475569',
            wrap: true
          },
          {
            type: 'text',
            text: 'เป้าขาย: ฿' + (ch.salesTarget ? Number(ch.salesTarget).toLocaleString() : '-'),
            size: 'xxs',
            color: '#475569'
          }
        ],
        paddingAll: 'sm'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียด',
              uri: `https://liff.line.me/${liffId}/channels/${ch.id}`
            },
            style: 'primary',
            color: '#0d9488',
            size: 'xs'
          }
        ],
        paddingAll: 'sm'
      }
    }
  })

  return {
    type: 'flex' as const,
    altText: keyword ? `🏪 ค้นหาบูธ: ${keyword}` : '🏪 งานอีเว้นท์ที่เปิดอยู่',
    contents: {
      type: 'carousel',
      contents: bubbles
    },
    quickReply: QUICK_REPLY_ITEMS
  }
}
