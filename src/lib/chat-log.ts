import { db } from '@/lib/db'

/**
 * Chat Log Service
 * 
 * บันทึกประวัติการสนทนากับ Line OA Bot ลงตาราง chat_logs
 * ⚠️ นี่คือ operation เขียน DB ที่อนุญาตเพียงอย่างเดียวของ bot
 */

interface ChatLogInput {
  sourceType: string        // 'user' | 'group' | 'room'
  sourceId: string | null   // LINE userId or groupId
  userName?: string | null
  userMessage: string
  botReply: string
  tokenData?: {
    inputTokens?: number
    outputTokens?: number
    modelName?: string
    responseTimeMs?: number
  }
}

/**
 * บันทึกประวัติการสนทนาลง DB
 * เก็บทั้งข้อความผู้ใช้และคำตอบ bot พร้อม token usage
 */
export async function logChatToDb(input: ChatLogInput): Promise<void> {
  try {
    await db.chatLog.create({
      data: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        userName: input.userName || null,
        userMessage: input.userMessage.substring(0, 5000), // จำกัดความยาว
        botReply: input.botReply.substring(0, 5000),
        inputTokens: input.tokenData?.inputTokens || 0,
        outputTokens: input.tokenData?.outputTokens || 0,
        modelName: input.tokenData?.modelName || null,
        responseTimeMs: input.tokenData?.responseTimeMs || null,
      },
    })
  } catch (err) {
    // Log error แต่ไม่ throw — ไม่ควรให้การ log ทำให้ bot พัง
    console.error('[ChatLog] Failed to save chat log:', err)
  }
}

/**
 * ดึงประวัติการสนทนาล่าสุดของ user (สำหรับ context ส่งให้ Gemini)
 * อ่านย้อนหลังไม่เกิน N ข้อความ
 */
export async function getRecentChatHistory(
  sourceId: string,
  limit: number = 6
): Promise<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>> {
  try {
    const logs = await db.chatLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        userMessage: true,
        botReply: true,
      },
    })

    // Reverse เพื่อให้เรียงจากเก่า → ใหม่ (Gemini ต้องการลำดับนี้)
    const history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    for (const log of logs.reverse()) {
      history.push({ role: 'user', parts: [{ text: log.userMessage }] })
      if (log.botReply) {
        history.push({ role: 'model', parts: [{ text: log.botReply }] })
      }
    }

    return history
  } catch (err) {
    console.error('[ChatLog] Failed to get chat history:', err)
    return []
  }
}
