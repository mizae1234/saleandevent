import { db } from '@/lib/db'
import { lineClient } from '@/lib/line-bot'

/**
 * Line User Service
 * 
 * จัดการข้อมูลผู้ใช้ Line OA Bot:
 * - Auto-register เมื่อ follow หรือส่งข้อความครั้งแรก
 * - ดึง/อัพเดท profile จาก Line Platform
 * - ตรวจสอบ role (ADMIN / USER / BLOCKED)
 */

export type LineUserRole = 'ADMIN' | 'USER' | 'BLOCKED'

export interface LineUserInfo {
  lineUserId: string
  displayName: string | null
  pictureUrl: string | null
  role: LineUserRole
  isActive: boolean
}

/**
 * ดึงหรือสร้าง Line User — ถ้ายังไม่มีจะ auto-register
 * อัพเดท displayName, pictureUrl, lastActiveAt ทุกครั้ง
 */
export async function getOrCreateLineUser(lineUserId: string): Promise<LineUserInfo> {
  // ดึง profile จาก Line Platform
  let displayName: string | null = null
  let pictureUrl: string | null = null
  try {
    const profile = await lineClient.getProfile(lineUserId)
    displayName = profile.displayName
    pictureUrl = profile.pictureUrl || null
  } catch (err) {
    console.error('[LineUser] Failed to get profile:', err)
  }

  // Upsert — สร้างใหม่ถ้ายังไม่มี, อัพเดท profile ถ้ามีแล้ว
  const user = await db.lineUser.upsert({
    where: { lineUserId },
    create: {
      lineUserId,
      displayName,
      pictureUrl,
      role: 'USER',
      isActive: true,
    },
    update: {
      displayName,
      pictureUrl,
      lastActiveAt: new Date(),
    },
  })

  return {
    lineUserId: user.lineUserId,
    displayName: user.displayName,
    pictureUrl: user.pictureUrl,
    role: user.role as LineUserRole,
    isActive: user.isActive,
  }
}

/**
 * ตรวจสอบว่า user มีสิทธิ์ใช้งาน bot หรือไม่
 * - BLOCKED → ปฏิเสธ
 * - isActive = false → ปฏิเสธ
 * - ADMIN / USER → อนุญาต
 */
export function isUserAllowed(user: LineUserInfo): boolean {
  return user.isActive && user.role !== 'BLOCKED'
}

/**
 * ตรวจสอบว่า user เป็น Admin หรือไม่
 */
export function isAdmin(user: LineUserInfo): boolean {
  return user.isActive && user.role === 'ADMIN'
}

/**
 * ดึงรายชื่อ user ทั้งหมด (สำหรับ admin)
 */
export async function listLineUsers(role?: string) {
  const where: any = {}
  if (role) where.role = role

  return db.lineUser.findMany({
    where,
    orderBy: { lastActiveAt: 'desc' },
    select: {
      lineUserId: true,
      displayName: true,
      role: true,
      isActive: true,
      lastActiveAt: true,
      createdAt: true,
    },
  })
}

/**
 * เปลี่ยน role ของ user (สำหรับ admin)
 */
export async function updateUserRole(lineUserId: string, newRole: LineUserRole) {
  return db.lineUser.update({
    where: { lineUserId },
    data: { role: newRole },
  })
}
