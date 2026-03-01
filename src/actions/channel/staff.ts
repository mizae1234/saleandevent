'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addStaffToChannel(channelId: string, staffId: string, isMain: boolean = false) {
    // Check if already assigned
    const existing = await db.channelStaff.findUnique({
        where: { channelId_staffId: { channelId, staffId } },
    });
    if (existing) throw new Error('พนักงานนี้อยู่ในช่องทางนี้แล้ว');

    await db.channelStaff.create({
        data: { channelId, staffId, isMain },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'staff_added',
            details: { staffId, isMain },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
}

export async function removeStaffFromChannel(channelId: string, channelStaffId: string) {
    await db.channelStaff.delete({
        where: { id: channelStaffId },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'staff_removed',
            details: { channelStaffId },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
}
