'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function closeChannelStock(
    channelId: string,
    items: { barcode: string; damaged: number; missing: number }[]
) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: { stock: true },
    });

    if (!channel) throw new Error('Channel not found');
    if (channel.type !== 'EVENT') throw new Error('Only EVENT channels can be closed');
    if (channel.status !== 'active') throw new Error('Channel must be active to close');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // Create return summary
        const returnSummary = await tx.returnSummary.create({
            data: {
                channelId,
                items: {
                    create: channel.stock.map((stockItem: any) => {
                        const closeItem = items.find(i => i.barcode === stockItem.barcode);
                        const remaining = stockItem.quantity - stockItem.soldQuantity;
                        return {
                            barcode: stockItem.barcode,
                            soldQuantity: stockItem.soldQuantity,
                            remainingQuantity: remaining - (closeItem?.damaged || 0) - (closeItem?.missing || 0),
                            damagedQuantity: closeItem?.damaged || 0,
                            missingQuantity: closeItem?.missing || 0,
                        };
                    }),
                },
            },
        });

        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'pending_return' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'close_stock_submitted',
                details: { returnSummaryId: returnSummary.id },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/pc/close');
}

export async function createReturnShipment(
    channelId: string,
    shipmentData: { provider: string; trackingNo?: string }
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'returning' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'return_shipment_created',
                details: shipmentData,
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/warehouse/return');
}

export async function confirmReturnReceived(channelId: string) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            returnSummaries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { items: true },
            },
        },
    });

    if (!channel) throw new Error('Channel not found');

    const returnSummary = channel.returnSummaries[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // Add returned stock back to warehouse
        if (returnSummary) {
            for (const item of returnSummary.items) {
                if (item.remainingQuantity > 0) {
                    await tx.warehouseStock.upsert({
                        where: { barcode: item.barcode },
                        update: { quantity: { increment: item.remainingQuantity } },
                        create: { barcode: item.barcode, quantity: item.remainingQuantity },
                    });

                    await tx.stockMovement.create({
                        data: {
                            movementType: 'RETURN',
                            barcode: item.barcode,
                            quantity: item.remainingQuantity,
                            fromLocation: channel.name,
                            toLocation: 'WAREHOUSE',
                            channelId,
                            notes: 'Stock returned from closed event',
                        },
                    });
                }
            }

            await tx.returnSummary.update({
                where: { id: returnSummary.id },
                data: { confirmedAt: new Date(), confirmedBy: 'system' },
            });
        }

        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'returned' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'return_confirmed',
                details: { returnSummaryId: returnSummary?.id },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/warehouse/return');
}

export async function closeChannelManual(channelId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'completed' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_closed',
                details: { closedManually: true },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}
