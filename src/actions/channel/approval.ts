'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitChannel(channelId: string) {
    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Channel not found');
    if (channel.status !== 'draft') throw new Error('Only draft channels can be submitted');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'submitted' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_submitted',
                details: { previousStatus: 'draft' },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}

export async function approveChannel(channelId: string) {
    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Channel not found');
    if (!['draft', 'submitted'].includes(channel.status)) {
        throw new Error('Only draft or submitted channels can be approved');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'approved' },
        });

        // Also approve all submitted stock requests for this channel
        await tx.stockRequest.updateMany({
            where: { channelId, status: 'submitted' },
            data: { status: 'approved' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_approved',
                details: { previousStatus: channel.status },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
    revalidatePath('/channels/approvals');
    revalidatePath('/warehouse/packing');
}
