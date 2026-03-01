'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { ReceivingItemInput } from '@/types/stock';

export async function confirmReceiving(
    requestId: string,
    items: ReceivingItemInput[],
    notes?: string
) {
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: {
            channel: true,
            allocations: true,
        },
    });

    if (!request) throw new Error('Stock request not found');
    if (request.status !== 'shipped') {
        throw new Error('Stock request must be in shipped status to confirm receiving');
    }

    const receivedTotal = items.reduce((sum, i) => sum + i.receivedQty, 0);

    await db.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // 1. Create Receiving record with items
        const receiving = await tx.receiving.create({
            data: {
                stockRequestId: requestId,
                receivedTotalQty: receivedTotal,
                receivedBy: '00000000-0000-0000-0000-000000000000',
                receivedAt: new Date(),
                notes: notes || null,
                items: {
                    create: items.map(item => ({
                        barcode: item.barcode,
                        allocatedQty: item.allocatedQty,
                        receivedQty: item.receivedQty,
                        differenceQty: item.allocatedQty - item.receivedQty,
                        remarks: item.remarks || null,
                    })),
                },
            },
        });

        // 2. CRITICAL: Create/Update ChannelStock for each received item
        for (const item of items) {
            if (item.receivedQty <= 0) continue;

            await tx.channelStock.upsert({
                where: {
                    channelId_barcode: {
                        channelId: request.channelId,
                        barcode: item.barcode,
                    },
                },
                update: {
                    quantity: { increment: item.receivedQty },
                },
                create: {
                    channelId: request.channelId,
                    barcode: item.barcode,
                    quantity: item.receivedQty,
                },
            });

            // 3. Create stock movement for each item
            await tx.stockMovement.create({
                data: {
                    movementType: 'RECEIVING',
                    barcode: item.barcode,
                    quantity: item.receivedQty,
                    fromLocation: 'WAREHOUSE',
                    toLocation: request.channel.name,
                    channelId: request.channelId,
                    referenceId: requestId,
                    notes: `Received from StockRequest ${request.requestType}`,
                },
            });

            // 4. Deduct warehouse stock
            await tx.warehouseStock.update({
                where: { barcode: item.barcode },
                data: {
                    quantity: { decrement: item.receivedQty },
                },
            }).catch(() => {
                // Warehouse stock record may not exist — skip
            });
        }

        // 5. Update StockRequest status
        await tx.stockRequest.update({
            where: { id: requestId },
            data: {
                status: 'received',
            },
        });

        // 6. Move channel to active when stock is received
        if (request.channel.status !== 'active') {
            await tx.salesChannel.update({
                where: { id: request.channelId },
                data: { status: 'active' },
            });
        }
    }, { timeout: 30000 });

    // Log
    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'stock_received',
            details: {
                requestId,
                receivedTotal,
                itemCount: items.length,
                differences: items.filter(i => i.allocatedQty !== i.receivedQty).map(i => ({
                    barcode: i.barcode,
                    allocated: i.allocatedQty,
                    received: i.receivedQty,
                    diff: i.allocatedQty - i.receivedQty,
                })),
            },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/pc/receive`);
    revalidatePath(`/channels/${request.channelId}`);
    revalidatePath(`/pc/pos/channel/${request.channelId}`);
    return { receivedTotal };
}
