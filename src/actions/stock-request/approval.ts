'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export async function approveStockRequest(requestId: string) {
    const session = await getSession();
    const userId = session?.staffId || '00000000-0000-0000-0000-000000000000';

    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { channel: true },
    });

    if (!request) throw new Error('Request not found');

    const txs: any[] = [
        db.stockRequest.update({
            where: { id: requestId },
            data: {
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: userId,
            },
        }),
        db.channelLog.create({
            data: {
                channelId: request.channelId,
                action: 'stock_request_approved',
                details: { requestId },
                changedBy: userId,
            },
        })
    ];

    if (['draft', 'submitted'].includes(request.channel.status)) {
        txs.push(
            db.salesChannel.update({
                where: { id: request.channelId },
                data: { status: 'approved' },
            })
        );
    }

    await db.$transaction(txs);

    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath('/channels/approvals');
    revalidatePath('/channels');
    revalidatePath('/warehouse/allocation');
    return request;
}

export async function rejectStockRequest(requestId: string, reason?: string) {
    const session = await getSession();
    const userId = session?.staffId || '00000000-0000-0000-0000-000000000000';

    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { channel: true },
    });

    if (!request) throw new Error('Request not found');

    await db.$transaction([
        db.stockRequest.update({
            where: { id: requestId },
            data: {
                status: 'cancelled',
                rejectedAt: new Date(),
                rejectedBy: userId,
                rejectionReason: reason || null,
            },
        }),
        db.channelLog.create({
            data: {
                channelId: request.channelId,
                action: 'stock_request_rejected',
                details: { requestId, reason },
                changedBy: userId,
            },
        })
    ]);

    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath('/channels/approvals');
    return request;
}
