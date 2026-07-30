'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import type { TransferItemInput, TransferReceivingInput } from '@/types/stock';

/**
 * Generate transfer code: TF-YYYYMMDD-NNN
 */
async function generateTransferCode(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `TF-${dateStr}`;

    const lastTransfer = await db.stockTransfer.findFirst({
        where: { transferCode: { startsWith: prefix } },
        orderBy: { transferCode: 'desc' },
        select: { transferCode: true },
    });

    let seq = 1;
    if (lastTransfer) {
        const lastSeq = parseInt(lastTransfer.transferCode.split('-').pop() || '0', 10);
        seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(3, '0')}`;
}

/**
 * Create stock transfer: deduct stock from source immediately
 * Logs to ChannelLog for both source and destination
 */
export async function createStockTransfer(
    fromChannelId: string,
    toChannelId: string,
    items: TransferItemInput[],
    notes?: string,
) {
    const session = await getSession();
    if (!session || !session.staffId) throw new Error('Unauthorized');

    const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'WAREHOUSE'];
    if (!ALLOWED_ROLES.includes(session.role)) {
        throw new Error('คุณไม่มีสิทธิ์โอนย้าย Stock');
    }

    if (fromChannelId === toChannelId) {
        throw new Error('ไม่สามารถโอนย้ายไปยัง Channel เดียวกันได้');
    }

    if (!items.length) {
        throw new Error('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    }

    // Validate channels exist
    const [fromChannel, toChannel] = await Promise.all([
        db.salesChannel.findUnique({ where: { id: fromChannelId }, select: { id: true, name: true, code: true, status: true } }),
        db.salesChannel.findUnique({ where: { id: toChannelId }, select: { id: true, name: true, code: true, status: true } }),
    ]);

    if (!fromChannel) throw new Error('ไม่พบ Channel ต้นทาง');
    if (!toChannel) throw new Error('ไม่พบ Channel ปลายทาง');

    // Validate stock availability
    const stockRecords = await db.channelStock.findMany({
        where: { channelId: fromChannelId, barcode: { in: items.map(i => i.barcode) } },
    });

    for (const item of items) {
        const stock = stockRecords.find(s => s.barcode === item.barcode);
        if (!stock) {
            throw new Error(`ไม่พบสินค้า barcode ${item.barcode} ใน Stock ต้นทาง`);
        }
        const remaining = stock.quantity - stock.soldQuantity;
        if (item.quantity > remaining) {
            throw new Error(`สินค้า ${item.barcode} มีเหลือ ${remaining} ชิ้น แต่ขอโอน ${item.quantity} ชิ้น`);
        }
        if (item.quantity <= 0) {
            throw new Error(`จำนวนโอนต้องมากกว่า 0`);
        }
    }

    const transferCode = await generateTransferCode();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transfer = await db.$transaction(async (tx: any) => {
        // 1. Create transfer record
        const tf = await tx.stockTransfer.create({
            data: {
                transferCode,
                fromChannelId,
                toChannelId,
                status: 'pending',
                notes: notes || null,
                createdBy: session.staffId,
                items: {
                    create: items.map(item => ({
                        barcode: item.barcode,
                        quantity: item.quantity,
                    })),
                },
            },
        });

        // 2. Deduct stock from source channel immediately
        for (const item of items) {
            await tx.channelStock.updateMany({
                where: { channelId: fromChannelId, barcode: item.barcode },
                data: { quantity: { decrement: item.quantity } },
            });

            // 3. Create stock movement for audit trail (TRANSFER_OUT)
            await tx.stockMovement.create({
                data: {
                    movementType: 'TRANSFER_OUT',
                    barcode: item.barcode,
                    quantity: item.quantity,
                    fromLocation: fromChannel.name,
                    toLocation: toChannel.name,
                    channelId: fromChannelId,
                    referenceId: tf.id,
                    notes: `โอนไป ${toChannel.name} (${transferCode})`,
                    createdBy: session.staffId,
                },
            });
        }

        // 4. Log to source channel
        await tx.channelLog.create({
            data: {
                channelId: fromChannelId,
                action: 'stock_transfer_out',
                details: {
                    transferId: tf.id,
                    transferCode,
                    toChannel: { id: toChannel.id, name: toChannel.name, code: toChannel.code },
                    totalItems: items.length,
                    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
                    items: items.map(i => ({ barcode: i.barcode, quantity: i.quantity })),
                    createdBy: session.name,
                },
                changedBy: session.staffId,
            },
        });

        // 5. Log to destination channel
        await tx.channelLog.create({
            data: {
                channelId: toChannelId,
                action: 'stock_transfer_in_pending',
                details: {
                    transferId: tf.id,
                    transferCode,
                    fromChannel: { id: fromChannel.id, name: fromChannel.name, code: fromChannel.code },
                    totalItems: items.length,
                    totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
                    items: items.map(i => ({ barcode: i.barcode, quantity: i.quantity })),
                    createdBy: session.name,
                },
                changedBy: session.staffId,
            },
        });

        return tf;
    }, { timeout: 30000 });

    revalidatePath(`/channels/${fromChannelId}`);
    revalidatePath(`/channels/${toChannelId}`);
    revalidatePath('/warehouse/stock-transfer');

    return { id: transfer.id, transferCode };
}

/**
 * Confirm receiving at destination: add stock to destination channel
 * Logs to ChannelLog for both channels
 */
export async function confirmTransferReceiving(
    transferId: string,
    items: TransferReceivingInput[],
) {
    const session = await getSession();
    if (!session || !session.staffId) throw new Error('Unauthorized');

    const transfer = await db.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
            fromChannel: { select: { id: true, name: true, code: true } },
            toChannel: { select: { id: true, name: true, code: true } },
            items: true,
        },
    });

    if (!transfer) throw new Error('ไม่พบใบโอนย้าย');
    if (transfer.status === 'received') throw new Error('ใบโอนย้ายนี้ได้รับสินค้าแล้ว');
    if (transfer.status === 'cancelled') throw new Error('ใบโอนย้ายนี้ถูกยกเลิกแล้ว');

    const totalReceived = items.reduce((sum, i) => sum + i.receivedQuantity, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // 1. Update each transfer item with received quantity
        for (const item of items) {
            const transferItem = transfer.items.find(ti => ti.barcode === item.barcode);
            if (!transferItem) continue;

            await tx.stockTransferItem.update({
                where: { id: transferItem.id },
                data: { receivedQuantity: item.receivedQuantity },
            });

            if (item.receivedQuantity <= 0) continue;

            // 2. Add stock to destination channel
            await tx.channelStock.upsert({
                where: {
                    channelId_barcode: {
                        channelId: transfer.toChannelId,
                        barcode: item.barcode,
                    },
                },
                update: {
                    quantity: { increment: item.receivedQuantity },
                },
                create: {
                    channelId: transfer.toChannelId,
                    barcode: item.barcode,
                    quantity: item.receivedQuantity,
                },
            });

            // 3. Create stock movement for audit trail (TRANSFER_IN)
            await tx.stockMovement.create({
                data: {
                    movementType: 'TRANSFER_IN',
                    barcode: item.barcode,
                    quantity: item.receivedQuantity,
                    fromLocation: transfer.fromChannel.name,
                    toLocation: transfer.toChannel.name,
                    channelId: transfer.toChannelId,
                    referenceId: transferId,
                    notes: `รับโอนจาก ${transfer.fromChannel.name} (${transfer.transferCode})`,
                    createdBy: session.staffId,
                },
            });

            // 4. Handle discrepancy: if received less than sent, the difference is lost
            const diff = item.sentQuantity - item.receivedQuantity;
            if (diff > 0) {
                await tx.stockMovement.create({
                    data: {
                        movementType: 'TRANSFER_LOSS',
                        barcode: item.barcode,
                        quantity: diff,
                        fromLocation: `ระหว่างทาง (${transfer.transferCode})`,
                        toLocation: 'LOSS',
                        channelId: transfer.fromChannelId,
                        referenceId: transferId,
                        notes: `สูญหาย/ชำรุดระหว่างโอนย้าย (ส่ง ${item.sentQuantity} รับ ${item.receivedQuantity})`,
                        createdBy: session.staffId,
                    },
                });
            }
        }

        // 5. Update transfer status
        await tx.stockTransfer.update({
            where: { id: transferId },
            data: {
                status: 'received',
                receivedAt: new Date(),
                updatedBy: session.staffId,
            },
        });

        // 6. Auto-activate destination channel if not already active
        //    (same behavior as receiving stock from warehouse)
        const destChannel = await tx.salesChannel.findUnique({
            where: { id: transfer.toChannelId },
            select: { status: true },
        });
        if (destChannel && destChannel.status !== 'active') {
            await tx.salesChannel.update({
                where: { id: transfer.toChannelId },
                data: { status: 'active' },
            });
        }

        // 6. Log to source channel
        await tx.channelLog.create({
            data: {
                channelId: transfer.fromChannelId,
                action: 'stock_transfer_received',
                details: {
                    transferId,
                    transferCode: transfer.transferCode,
                    toChannel: { id: transfer.toChannel.id, name: transfer.toChannel.name },
                    totalReceived,
                    differences: items.filter(i => i.sentQuantity !== i.receivedQuantity).map(i => ({
                        barcode: i.barcode,
                        sent: i.sentQuantity,
                        received: i.receivedQuantity,
                        loss: i.sentQuantity - i.receivedQuantity,
                    })),
                    confirmedBy: session.name,
                },
                changedBy: session.staffId,
            },
        });

        // 7. Log to destination channel
        await tx.channelLog.create({
            data: {
                channelId: transfer.toChannelId,
                action: 'stock_transfer_in_confirmed',
                details: {
                    transferId,
                    transferCode: transfer.transferCode,
                    fromChannel: { id: transfer.fromChannel.id, name: transfer.fromChannel.name },
                    totalReceived,
                    items: items.map(i => ({
                        barcode: i.barcode,
                        sent: i.sentQuantity,
                        received: i.receivedQuantity,
                    })),
                    confirmedBy: session.name,
                },
                changedBy: session.staffId,
            },
        });
    }, { timeout: 30000 });

    revalidatePath(`/channels/${transfer.fromChannelId}`);
    revalidatePath(`/channels/${transfer.toChannelId}`);
    revalidatePath('/warehouse/stock-transfer');
    revalidatePath(`/warehouse/stock-transfer/${transferId}`);

    return { totalReceived };
}

/**
 * Cancel transfer: return stock to source channel
 * Only for pending or shipped transfers
 * Logs to ChannelLog for both channels
 */
export async function cancelTransfer(
    transferId: string,
    reason?: string,
) {
    const session = await getSession();
    if (!session || !session.staffId) throw new Error('Unauthorized');

    const transfer = await db.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
            fromChannel: { select: { id: true, name: true, code: true } },
            toChannel: { select: { id: true, name: true, code: true } },
            items: true,
        },
    });

    if (!transfer) throw new Error('ไม่พบใบโอนย้าย');
    if (transfer.status === 'received') throw new Error('ไม่สามารถยกเลิกได้ เนื่องจากรับสินค้าแล้ว');
    if (transfer.status === 'cancelled') throw new Error('ใบโอนย้ายนี้ถูกยกเลิกแล้ว');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // 1. Return stock to source channel
        for (const item of transfer.items) {
            await tx.channelStock.updateMany({
                where: { channelId: transfer.fromChannelId, barcode: item.barcode },
                data: { quantity: { increment: item.quantity } },
            });

            // Create stock movement for audit trail (TRANSFER_CANCEL)
            await tx.stockMovement.create({
                data: {
                    movementType: 'TRANSFER_CANCEL',
                    barcode: item.barcode,
                    quantity: item.quantity,
                    fromLocation: `ยกเลิกโอน (${transfer.transferCode})`,
                    toLocation: transfer.fromChannel.name,
                    channelId: transfer.fromChannelId,
                    referenceId: transferId,
                    notes: `คืน Stock จากการยกเลิกโอนย้าย | เหตุผล: ${reason || '-'}`,
                    createdBy: session.staffId,
                },
            });
        }

        // 2. Update transfer status
        await tx.stockTransfer.update({
            where: { id: transferId },
            data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: reason || null,
                updatedBy: session.staffId,
            },
        });

        // 3. Log to source channel
        await tx.channelLog.create({
            data: {
                channelId: transfer.fromChannelId,
                action: 'stock_transfer_cancelled',
                details: {
                    transferId,
                    transferCode: transfer.transferCode,
                    toChannel: { id: transfer.toChannel.id, name: transfer.toChannel.name },
                    reason: reason || '-',
                    totalReturned: transfer.items.reduce((sum, i) => sum + i.quantity, 0),
                    items: transfer.items.map(i => ({ barcode: i.barcode, quantity: i.quantity })),
                    cancelledBy: session.name,
                },
                changedBy: session.staffId,
            },
        });

        // 4. Log to destination channel
        await tx.channelLog.create({
            data: {
                channelId: transfer.toChannelId,
                action: 'stock_transfer_in_cancelled',
                details: {
                    transferId,
                    transferCode: transfer.transferCode,
                    fromChannel: { id: transfer.fromChannel.id, name: transfer.fromChannel.name },
                    reason: reason || '-',
                    cancelledBy: session.name,
                },
                changedBy: session.staffId,
            },
        });
    }, { timeout: 30000 });

    revalidatePath(`/channels/${transfer.fromChannelId}`);
    revalidatePath(`/channels/${transfer.toChannelId}`);
    revalidatePath('/warehouse/stock-transfer');
    revalidatePath(`/warehouse/stock-transfer/${transferId}`);
}
