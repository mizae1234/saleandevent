'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { calculateDistanceKm, formatDistanceThai, isValidLatLng } from '@/lib/geo';

/**
 * Returns today's date string in YYYY-MM-DD in Asia/Bangkok timezone
 */
export async function getBangkokDateString(date: Date = new Date()): Promise<string> {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}

/**
 * Returns minutes from midnight (0..1439) in Asia/Bangkok for a Date
 */
function getBangkokMinutesFromMidnight(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return hour * 60 + minute;
}

/**
 * Parses "HH:mm" string into minutes from midnight
 */
function parseTimeMinutes(hhmm: string | null | undefined): number | null {
    if (!hhmm) return null;
    const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
}

export interface PerformCheckInInput {
    channelId?: string | null;
    isHeadOffice?: boolean;
    lat: number;
    lng: number;
    photoUrl: string;
    note?: string;
}

export async function performCheckIn(input: PerformCheckInInput) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'กรุณาเข้าสู่ระบบก่อนลงเวลาทำงาน' };
        }

        if (!input.photoUrl || !input.photoUrl.trim()) {
            return { error: 'กรุณาถ่ายภาพหน้างานก่อนกดยืนยัน Check-in' };
        }

        if (!isValidLatLng(input.lat, input.lng)) {
            return { error: 'ไม่พบพิกัด GPS ที่ถูกต้อง กรุณาเปิด Location (GPS) แล้วลองอีกครั้ง' };
        }

        const todayStr = await getBangkokDateString();
        const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

        // 1. Check 1 person per 1 place per day
        const existingToday = await db.staffCheckIn.findUnique({
            where: {
                staffId_date: {
                    staffId: session.staffId,
                    date: todayDate,
                },
            },
        });

        if (existingToday) {
            return {
                error: `วันนี้คุณได้ลงเวลาเข้างานที่ "${existingToday.locationName}" ไปแล้ว (จำกัด 1 คน ต่อ 1 สถานที่ ต่อวัน)`,
            };
        }

        // 2. Load target location GPS, allowed radius, and shift times
        let targetLat: number | null = null;
        let targetLng: number | null = null;
        let radiusKm = 0.5;
        let locationType = 'EVENT';
        let locationName = '';
        let channelId: string | null = null;
        let shiftStartTime = '10:00';
        let shiftEndTime = '21:00';

        if (input.isHeadOffice || !input.channelId) {
            const company = await db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            });
            if (!company || company.latitude === null || company.longitude === null) {
                return {
                    error: 'ยังไม่ได้ตั้งค่าพิกัด GPS ของสำนักงานใหญ่ กรุณาแจ้งผู้ดูแลระบบตั้งค่าพิกัดสำนักงานใหญ่ก่อน',
                };
            }
            targetLat = company.latitude;
            targetLng = company.longitude;
            radiusKm = company.checkInRadiusKm ?? 0.5;
            locationType = 'HQ';
            locationName = company.branchName || 'สำนักงานใหญ่';
            channelId = null;
            shiftStartTime = company.workStartTime || '09:00';
            shiftEndTime = company.workEndTime || '18:00';
        } else {
            const channel = await db.salesChannel.findUnique({
                where: { id: input.channelId },
            });
            if (!channel) {
                return { error: 'ไม่พบข้อมูลช่องทางขาย / สาขา' };
            }
            if (channel.latitude === null || channel.longitude === null) {
                return {
                    error: `ช่องทาง "${channel.name}" ยังไม่ได้ระบุพิกัด GPS กรุณาแจ้งผู้ดูแลระบบตั้งค่าพิกัดก่อน Check-in`,
                };
            }
            targetLat = channel.latitude;
            targetLng = channel.longitude;
            radiusKm = channel.checkInRadiusKm ?? 0.5;
            locationType = channel.type || 'EVENT';
            locationName = `${channel.name} (${channel.code})`;
            channelId = channel.id;
            shiftStartTime = channel.workStartTime || '10:00';
            shiftEndTime = channel.workEndTime || '21:00';
        }

        // 3. Calculate distance and enforce radius
        const distanceKm = calculateDistanceKm(input.lat, input.lng, targetLat, targetLng);

        if (distanceKm > radiusKm) {
            return {
                error: `ไม่สามารถ Check-in ได้ เนื่องจากคุณอยู่นอกรัศมีที่กำหนด! ระยะห่างปัจจุบัน ${formatDistanceThai(distanceKm)} (อนุญาตไม่เกิน ${radiusKm} กม.)`,
                outOfRange: true,
                distanceKm,
                radiusKm,
            };
        }

        // 4. Calculate lateMinutes against shiftStartTime
        const now = new Date();
        const checkInMin = getBangkokMinutesFromMidnight(now);
        const shiftStartMin = parseTimeMinutes(shiftStartTime);
        const lateMinutes =
            shiftStartMin !== null ? Math.max(0, checkInMin - shiftStartMin) : 0;

        // 5. Create Check-in record
        const created = await db.staffCheckIn.create({
            data: {
                staffId: session.staffId,
                channelId,
                locationType,
                locationName,
                date: todayDate,
                shiftStartTime,
                shiftEndTime,
                checkInAt: now,
                checkInLat: input.lat,
                checkInLng: input.lng,
                checkInDistanceKm: Number(distanceKm.toFixed(4)),
                checkInPhotoUrl: input.photoUrl.trim(),
                checkInNote: input.note?.trim() || null,
                lateMinutes,
            },
        });

        revalidatePath('/workspace');
        revalidatePath('/workspace/attendance');
        if (channelId) {
            revalidatePath(`/channel/${channelId}`);
        }
        revalidatePath('/hr/attendance');

        return {
            success: true,
            checkInId: created.id,
            distanceKm,
            lateMinutes,
        };
    } catch (error: any) {
        console.error('performCheckIn error:', error);
        return { error: error.message || 'เกิดข้อผิดพลาดในการ Check-in' };
    }
}

export interface PerformCheckOutInput {
    checkInId: string;
    lat: number;
    lng: number;
    photoUrl: string;
    isForgotCheckOut?: boolean;
    forgotCheckOutReason?: string;
}

export async function performCheckOut(input: PerformCheckOutInput) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'กรุณาเข้าสู่ระบบก่อนลงเวลาออกงาน' };
        }

        if (!input.photoUrl || !input.photoUrl.trim()) {
            return { error: 'กรุณาถ่ายภาพก่อนกดยืนยัน Check-out' };
        }

        if (!isValidLatLng(input.lat, input.lng)) {
            return { error: 'ไม่พบพิกัด GPS ที่ถูกต้อง กรุณาเปิด Location (GPS) แล้วลองอีกครั้ง' };
        }

        const record = await db.staffCheckIn.findUnique({
            where: { id: input.checkInId },
            include: { channel: true },
        });

        if (!record) {
            return { error: 'ไม่พบรอบการ Check-in ของวันนี้' };
        }

        if (record.staffId !== session.staffId) {
            return { error: 'คุณไม่มีสิทธิ์ Check-out แทนพนักงานคนอื่น' };
        }

        if (record.checkOutAt) {
            return { error: 'คุณได้กด Check-out สำหรับวันนี้ไปแล้ว' };
        }

        // Load target coordinates & shift end time
        let targetLat: number | null = null;
        let targetLng: number | null = null;
        let radiusKm = 0.5;
        let shiftEndTime = record.shiftEndTime || '21:00';

        if (record.channelId && record.channel) {
            targetLat = record.channel.latitude;
            targetLng = record.channel.longitude;
            radiusKm = record.channel.checkInRadiusKm ?? 0.5;
            shiftEndTime = record.shiftEndTime || record.channel.workEndTime || '21:00';
        } else {
            const company = await db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            });
            if (company) {
                targetLat = company.latitude;
                targetLng = company.longitude;
                radiusKm = company.checkInRadiusKm ?? 0.5;
                shiftEndTime = record.shiftEndTime || company.workEndTime || '18:00';
            }
        }

        let distanceKm: number | null = null;
        let isOutOfRange = false;

        if (targetLat !== null && targetLng !== null) {
            distanceKm = calculateDistanceKm(input.lat, input.lng, targetLat, targetLng);
            if (distanceKm > radiusKm) {
                isOutOfRange = true;
            }
        }

        // If outside radius, require isForgotCheckOut = true
        if (isOutOfRange && !input.isForgotCheckOut) {
            return {
                error: `คุณอยู่นอกพื้นที่หน้างาน (ห่าง ${formatDistanceThai(distanceKm!)} / กำหนดไม่เกิน ${radiusKm} กม.) หากลืม Check-out จากหน้างาน กรุณาติ๊กเลือก "ลืม Check-out (ยืนยัน Check-out นอกพื้นที่)" ด้านล่าง`,
                outOfRange: true,
                distanceKm,
                radiusKm,
            };
        }

        const now = new Date();
        const diffHours = Math.max(
            0,
            Number(((now.getTime() - new Date(record.checkInAt).getTime()) / (1000 * 60 * 60)).toFixed(2))
        );

        const checkOutMin = getBangkokMinutesFromMidnight(now);
        const shiftEndMin = parseTimeMinutes(shiftEndTime);
        const earlyLeaveMinutes =
            shiftEndMin !== null ? Math.max(0, shiftEndMin - checkOutMin) : 0;

        await db.staffCheckIn.update({
            where: { id: record.id },
            data: {
                checkOutAt: now,
                checkOutLat: input.lat,
                checkOutLng: input.lng,
                checkOutDistanceKm: distanceKm !== null ? Number(distanceKm.toFixed(4)) : null,
                checkOutPhotoUrl: input.photoUrl.trim(),
                isForgotCheckOut: Boolean(input.isForgotCheckOut || isOutOfRange),
                forgotCheckOutReason: input.forgotCheckOutReason?.trim() || null,
                hoursWorked: diffHours,
                earlyLeaveMinutes,
            },
        });

        revalidatePath('/workspace');
        revalidatePath('/workspace/attendance');
        if (record.channelId) {
            revalidatePath(`/channel/${record.channelId}`);
        }
        revalidatePath('/hr/attendance');

        return {
            success: true,
            hoursWorked: diffHours,
            distanceKm,
            isForgotCheckOut: Boolean(input.isForgotCheckOut || isOutOfRange),
            earlyLeaveMinutes,
        };
    } catch (error: any) {
        console.error('performCheckOut error:', error);
        return { error: error.message || 'เกิดข้อผิดพลาดในการ Check-out' };
    }
}

export async function updateLocationGpsConfig(input: {
    targetType: 'HQ' | 'CHANNEL';
    channelId?: string;
    latitude: number;
    longitude: number;
    checkInRadiusKm: number;
    workStartTime?: string;
    workEndTime?: string;
}) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'Unauthorized' };
        }

        if (!isValidLatLng(input.latitude, input.longitude)) {
            return { error: 'พิกัด Latitude / Longitude ไม่ถูกต้อง' };
        }

        const radius = input.checkInRadiusKm > 0 ? input.checkInRadiusKm : 0.5;

        if (input.targetType === 'HQ') {
            const existing = await db.companySetting.findFirst({
                orderBy: { createdAt: 'asc' },
            });
            if (existing) {
                await db.companySetting.update({
                    where: { id: existing.id },
                    data: {
                        latitude: input.latitude,
                        longitude: input.longitude,
                        checkInRadiusKm: radius,
                        workStartTime: input.workStartTime || '09:00',
                        workEndTime: input.workEndTime || '18:00',
                        updatedBy: session.staffId,
                    },
                });
            }
            revalidatePath('/admin/company');
        } else if (input.targetType === 'CHANNEL' && input.channelId) {
            await db.salesChannel.update({
                where: { id: input.channelId },
                data: {
                    latitude: input.latitude,
                    longitude: input.longitude,
                    checkInRadiusKm: radius,
                    workStartTime: input.workStartTime || '10:00',
                    workEndTime: input.workEndTime || '21:00',
                    updatedBy: session.staffId,
                },
            });
            revalidatePath(`/channels/${input.channelId}`);
            revalidatePath(`/channel/${input.channelId}`);
        }

        revalidatePath('/workspace');
        revalidatePath('/workspace/attendance');
        revalidatePath('/hr/attendance');

        return { success: true };
    } catch (error: any) {
        console.error('updateLocationGpsConfig error:', error);
        return { error: error.message || 'ไม่สามารถบันทึกพิกัดได้' };
    }
}
