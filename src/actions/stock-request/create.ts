'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createStockRequest(
    channelId: string,
    requestType: 'INITIAL' | 'TOPUP',
    requestedTotalQuantity: number,
    notes?: string,
    items?: { barcode: string; quantity: number; notes?: string }[],
    submitNow: boolean = false
) {
    const finalStatus = submitNow ? 'submitted' : 'draft';

    const request = await db.$transaction(async (tx) => {
        const req = await tx.stockRequest.create({
            data: {
                channelId,
                requestType,
                requestedTotalQuantity,
                status: finalStatus,
                notes: notes || null,
                ...(items && items.length > 0 && {
                    items: {
                        create: items.map(item => ({
                            barcode: item.barcode,
                            quantity: item.quantity,
                            notes: item.notes || null,
                        })),
                    },
                }),
            },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: submitNow ? 'stock_request_submitted' : 'stock_request_created',
                details: {
                    requestId: req.id,
                    requestType,
                    requestedTotalQuantity,
                },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });

        return req;
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels/approvals');
    return request;
}

export async function updateStockRequest(
    requestId: string,
    data: { requestedTotalQuantity?: number; notes?: string | null }
) {
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
    });

    if (!request) throw new Error('Stock request not found');
    if (['shipped', 'received', 'cancelled'].includes(request.status)) {
        throw new Error('ไม่สามารถแก้ไขคำขอที่จัดส่งแล้วหรือยกเลิกแล้ว');
    }

    const updated = await db.stockRequest.update({
        where: { id: requestId },
        data: {
            ...(data.requestedTotalQuantity !== undefined && { requestedTotalQuantity: data.requestedTotalQuantity }),
            ...(data.notes !== undefined && { notes: data.notes }),
        },
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'stock_request_updated',
            details: {
                requestId,
                changes: data,
            },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/pc/refill`);
    revalidatePath(`/pc/refill/${requestId}`);
    revalidatePath(`/channels/${request.channelId}`);
    return updated;
}

export async function submitStockRequest(requestId: string) {
    const request = await db.stockRequest.update({
        where: { id: requestId },
        data: { status: 'submitted' },
        include: { channel: true },
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'stock_request_submitted',
            details: { requestId },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath('/channels/approvals');
    return request;
}
