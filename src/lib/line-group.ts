import { db } from '@/lib/db'
import { lineClient } from '@/lib/line-bot'

/**
 * Line Group Service
 *
 * จัดการข้อมูลกลุ่ม Line ที่ Bot ถูก add เข้าไป:
 * - บันทึกเมื่อ bot join group
 * - อัพเดท member count / group name
 * - บันทึกเมื่อ bot ถูก kick ออก
 */

/** บันทึกกลุ่มเมื่อ bot ถูก add เข้า group */
export async function registerGroup(groupId: string, invitedByUserId?: string) {
  // ดึงข้อมูลกลุ่มจาก Line Platform
  let groupName: string | null = null
  let memberCount: number | null = null
  try {
    const summary = await lineClient.getGroupSummary(groupId)
    groupName = summary.groupName || null
    const membersRes = await lineClient.getGroupMembersCount(groupId)
    memberCount = typeof membersRes === 'number' ? membersRes : (membersRes as any)?.count ?? null
  } catch (err) {
    console.error('[LineGroup] Failed to get group info:', err)
  }

  const group = await db.lineGroup.upsert({
    where: { groupId },
    create: {
      groupId,
      groupName,
      memberCount,
      invitedBy: invitedByUserId || null,
      isActive: true,
    },
    update: {
      groupName,
      memberCount,
      isActive: true,
      leftAt: null, // re-join → clear leftAt
      lastActiveAt: new Date(),
    },
  })

  console.log(`[LineGroup] 👥 Registered group: ${groupName || groupId}`)
  return group
}

/** อัพเดท lastActiveAt เมื่อมี activity ในกลุ่ม */
export async function updateGroupActivity(groupId: string) {
  try {
    await db.lineGroup.update({
      where: { groupId },
      data: { lastActiveAt: new Date() },
    })
  } catch {
    // group ยังไม่ถูก register → register ใหม่
    await registerGroup(groupId)
  }
}

/** บันทึกเมื่อ bot ถูก kick ออกจากกลุ่ม */
export async function markGroupLeft(groupId: string) {
  try {
    await db.lineGroup.update({
      where: { groupId },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    })
    console.log(`[LineGroup] 👋 Left group: ${groupId}`)
  } catch (err) {
    console.error('[LineGroup] Failed to mark group left:', err)
  }
}

/** ดึงรายชื่อกลุ่มทั้งหมด */
export async function listGroups() {
  return db.lineGroup.findMany({
    orderBy: { lastActiveAt: 'desc' },
  })
}
