'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function approveStockRequest(requestId: string) {
    const request = await db.stockRequest.update({
        where: { id: requestId },
        data: {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: '00000000-0000-0000-0000-000000000000',
        },
        include: { channel: true },
    });

    // Also approve the parent channel if it's still in draft/submitted
    if (['draft', 'submitted'].includes(request.channel.status)) {
        await db.salesChannel.update({
            where: { id: request.channelId },
            data: { status: 'approved' },
        });
    }

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'stock_request_approved',
            details: { requestId },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath('/channels/approvals');
    revalidatePath('/channels');
    revalidatePath('/warehouse/allocation');
    return request;
}

export async function rejectStockRequest(requestId: string, reason?: string) {
    const request = await db.stockRequest.update({
        where: { id: requestId },
        data: {
            status: 'cancelled',
            rejectedAt: new Date(),
            rejectedBy: '00000000-0000-0000-0000-000000000000',
            rejectionReason: reason || null,
        },
        include: { channel: true },
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'stock_request_rejected',
            details: { requestId, reason },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath('/channels/approvals');
    return request;
}
