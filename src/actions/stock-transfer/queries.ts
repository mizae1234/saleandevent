'use server';

import { db } from '@/lib/db';

/**
 * Get all stock transfers with channel info
 */
export async function getStockTransfers(statusFilter?: string) {
    const transfers = await db.stockTransfer.findMany({
        where: statusFilter ? { status: statusFilter } : undefined,
        include: {
            fromChannel: { select: { id: true, code: true, name: true, type: true, status: true } },
            toChannel: { select: { id: true, code: true, name: true, type: true, status: true } },
            items: {
                include: {
                    product: { select: { name: true, code: true, size: true, color: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return transfers.map(t => ({
        id: t.id,
        transferCode: t.transferCode,
        fromChannel: t.fromChannel,
        toChannel: t.toChannel,
        status: t.status,
        notes: t.notes,
        totalItems: t.items.length,
        totalQuantity: t.items.reduce((sum, i) => sum + i.quantity, 0),
        totalReceived: t.items.reduce((sum, i) => sum + i.receivedQuantity, 0),
        createdAt: t.createdAt.toISOString(),
        shippedAt: t.shippedAt?.toISOString() || null,
        receivedAt: t.receivedAt?.toISOString() || null,
        cancelledAt: t.cancelledAt?.toISOString() || null,
    }));
}

/**
 * Get single stock transfer with full details
 */
export async function getStockTransferById(id: string) {
    const transfer = await db.stockTransfer.findUnique({
        where: { id },
        include: {
            fromChannel: { select: { id: true, code: true, name: true, type: true, status: true, location: true } },
            toChannel: { select: { id: true, code: true, name: true, type: true, status: true, location: true } },
            items: {
                include: {
                    product: { select: { name: true, code: true, size: true, color: true, producttype: true, price: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!transfer) return null;

    return {
        id: transfer.id,
        transferCode: transfer.transferCode,
        fromChannel: transfer.fromChannel,
        toChannel: transfer.toChannel,
        status: transfer.status,
        notes: transfer.notes,
        cancelReason: transfer.cancelReason,
        items: transfer.items.map(i => ({
            id: i.id,
            barcode: i.barcode,
            quantity: i.quantity,
            receivedQuantity: i.receivedQuantity,
            product: {
                name: i.product.name,
                code: i.product.code,
                size: i.product.size,
                color: i.product.color,
                producttype: i.product.producttype,
                price: i.product.price ? Number(i.product.price) : 0,
            },
        })),
        createdAt: transfer.createdAt.toISOString(),
        shippedAt: transfer.shippedAt?.toISOString() || null,
        receivedAt: transfer.receivedAt?.toISOString() || null,
        cancelledAt: transfer.cancelledAt?.toISOString() || null,
    };
}

/**
 * Get channels that can be transfer sources (have remaining stock)
 */
export async function getTransferableChannels() {
    const channels = await db.salesChannel.findMany({
        where: {
            isActive: true,
            status: { in: ['approved', 'active', 'pending_payment', 'payment_approved'] },
        },
        select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
            location: true,
            startDate: true,
            endDate: true,
            stock: {
                select: {
                    barcode: true,
                    quantity: true,
                    soldQuantity: true,
                },
            },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return channels
        .map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            type: c.type,
            status: c.status,
            location: c.location,
            startDate: c.startDate?.toISOString() || null,
            endDate: c.endDate?.toISOString() || null,
            totalRemaining: c.stock.reduce((sum, s) => sum + Math.max(0, s.quantity - s.soldQuantity), 0),
        }));
}

/**
 * Get available stock for a specific channel (remaining = quantity - soldQuantity)
 */
export async function getAvailableStock(channelId: string) {
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

    return stock
        .filter(s => s.quantity - s.soldQuantity > 0)
        .map(s => ({
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
