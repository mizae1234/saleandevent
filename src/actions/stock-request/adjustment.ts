'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export interface AdjustmentItem {
    barcode: string;
    currentQty: number;
    newQty: number;
    reason: string;
}

/**
 * Adjust channel stock quantities directly.
 * Creates StockMovement records for audit trail.
 * Only ADMIN/MANAGER/WAREHOUSE roles are allowed.
 */
export async function adjustChannelStock(
    channelId: string,
    items: AdjustmentItem[]
) {
    const session = await getSession();
    if (!session || !session.staffId) throw new Error('Unauthorized');

    const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'WAREHOUSE'];
    if (!ALLOWED_ROLES.includes(session.role)) {
        throw new Error('คุณไม่มีสิทธิ์ปรับปรุง Stock');
    }

    // Validate channel exists
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        select: { id: true, name: true, code: true },
    });
    if (!channel) throw new Error('ไม่พบช่องทางขาย');

    // Filter out items with no change
    const changedItems = items.filter(item => item.newQty !== item.currentQty);
    if (changedItems.length === 0) {
        return { error: 'ไม่มีรายการที่เปลี่ยนแปลง' };
    }

    // Validate no negative quantities
    const negativeItems = changedItems.filter(item => item.newQty < 0);
    if (negativeItems.length > 0) {
        return { error: 'จำนวนสินค้าต้องไม่ติดลบ' };
    }

    await db.$transaction(async (tx) => {
        for (const item of changedItems) {
            const diff = item.newQty - item.currentQty;

            // Update ChannelStock
            await tx.channelStock.updateMany({
                where: {
                    channelId,
                    barcode: item.barcode,
                },
                data: {
                    quantity: item.newQty,
                    updatedBy: session.staffId,
                },
            });

            // Create StockMovement for audit trail
            await tx.stockMovement.create({
                data: {
                    movementType: 'ADJUSTMENT',
                    barcode: item.barcode,
                    quantity: Math.abs(diff),
                    fromLocation: diff > 0 ? 'ADJUSTMENT_IN' : channel.name,
                    toLocation: diff > 0 ? channel.name : 'ADJUSTMENT_OUT',
                    channelId,
                    notes: `${diff > 0 ? '+' : ''}${diff} | ${item.reason} | โดย ${session.name}`,
                    createdBy: session.staffId,
                },
            });

            // Sync warehouse stock (optional: only if reducing channel stock)
            if (diff < 0) {
                // Stock removed from channel → return to warehouse
                await tx.warehouseStock.update({
                    where: { barcode: item.barcode },
                    data: { quantity: { increment: Math.abs(diff) } },
                }).catch(() => {
                    // WarehouseStock may not exist for this barcode — skip
                });
            } else if (diff > 0) {
                // Stock added to channel → deduct from warehouse
                await tx.warehouseStock.update({
                    where: { barcode: item.barcode },
                    data: { quantity: { decrement: diff } },
                }).catch(() => {
                    // WarehouseStock may not exist — skip
                });
            }
        }
    }, { timeout: 30000 });

    // Log the adjustment
    await db.channelLog.create({
        data: {
            channelId,
            action: 'stock_adjusted',
            details: {
                adjustedBy: session.name,
                adjustedById: session.staffId,
                totalItemsChanged: changedItems.length,
                changes: changedItems.map(i => ({
                    barcode: i.barcode,
                    from: i.currentQty,
                    to: i.newQty,
                    diff: i.newQty - i.currentQty,
                    reason: i.reason,
                })),
            },
            changedBy: session.staffId,
        },
    });

    revalidatePath(`/warehouse/stock-adjustment`);
    revalidatePath(`/channels/${channelId}`);
    revalidatePath(`/pc/pos/channel/${channelId}`);

    return {
        success: true,
        totalChanged: changedItems.length,
    };
}

/**
 * Get all channels with stock for the adjustment page
 */
export async function getChannelsWithStock() {
    const channels = await db.salesChannel.findMany({
        where: {
            isActive: true,
        },
        select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
            location: true,
            _count: {
                select: { stock: true },
            },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return channels.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        type: c.type,
        status: c.status,
        location: c.location,
        stockCount: c._count.stock,
    }));
}

/**
 * Get stock details for a specific channel (for adjustment)
 */
export async function getChannelStockForAdjustment(channelId: string) {
    const stock = await db.channelStock.findMany({
        where: { channelId },
        include: {
            product: {
                select: {
                    barcode: true,
                    code: true,
                    name: true,
                    size: true,
                    color: true,
                    producttype: true,
                },
            },
        },
        orderBy: [
            { product: { code: 'asc' } },
            { product: { color: 'asc' } },
            { product: { size: 'asc' } },
        ],
    });

    return stock.map(s => ({
        id: s.id,
        barcode: s.barcode,
        quantity: s.quantity,
        soldQuantity: s.soldQuantity,
        remaining: s.quantity - s.soldQuantity,
        product: {
            code: s.product.code,
            name: s.product.name,
            size: s.product.size,
            color: s.product.color,
            producttype: s.product.producttype,
        },
    }));
}

/**
 * Get recent stock adjustment history for a channel
 */
export async function getAdjustmentHistory(channelId: string) {
    const movements = await db.stockMovement.findMany({
        where: {
            channelId,
            movementType: 'ADJUSTMENT',
        },
        include: {
            product: {
                select: { name: true, code: true, color: true, size: true },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return movements.map(m => ({
        id: m.id,
        barcode: m.barcode,
        quantity: m.quantity,
        fromLocation: m.fromLocation,
        toLocation: m.toLocation,
        notes: m.notes,
        createdAt: m.createdAt.toISOString(),
        product: m.product,
    }));
}
