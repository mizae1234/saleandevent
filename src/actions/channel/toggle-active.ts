'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Toggle the isActive flag on a SalesChannel.
 * When inactive, the channel's sales are excluded from all dashboard calculations
 * and POS is blocked for the channel.
 */
export async function toggleChannelActive(channelId: string): Promise<{ isActive: boolean }> {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        select: { isActive: true },
    });

    if (!channel) {
        throw new Error('ไม่พบช่องทางการขาย');
    }

    const newIsActive = !channel.isActive;

    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { isActive: newIsActive },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: newIsActive ? 'channel_activated' : 'channel_deactivated',
                details: { isActive: newIsActive },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
    revalidatePath('/pc/pos');
    revalidatePath('/pc/sales');
    revalidatePath('/');

    return { isActive: newIsActive };
}
