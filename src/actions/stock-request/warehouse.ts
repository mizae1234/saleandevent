'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { AllocationRow } from '@/types/stock';

export async function uploadAllocation(requestId: string, inputRows: AllocationRow[], adminOverride: boolean = false) {
    let rows = inputRows;
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { allocations: true },
    });

    if (!request) throw new Error('Stock request not found');
    if (!['approved', 'allocated'].includes(request.status)) {
        throw new Error('Stock request must be in approved status to upload allocation');
    }

    // Calculate total packed quantity (no blocking — warning shown on client side)
    const totalPacked = rows.reduce((sum, r) => sum + r.packedQuantity, 0);

    // Extract product codes — use explicit `code` field if available, fallback to barcode parsing
    const codeSet = [...new Set(rows.map(r => {
        if (r.code) return r.code;
        // Legacy fallback: last resort parsing (unreliable for codes with hyphens)
        const parts = r.barcode.split('-');
        if (r.size) parts.pop(); // remove size
        parts.pop(); // remove color
        return parts.join('-');
    }))];

    const products = await db.product.findMany({
        where: { code: { in: codeSet } },
    });

    // Check for missing codes
    const existingCodes = new Set(products.map(p => p.code));
    const missingCodes = codeSet.filter(c => !existingCodes.has(c));
    if (missingCodes.length > 0 && !adminOverride) {
        return {
            error: `ไม่พบรหัสสินค้าในระบบ: ${missingCodes.join(', ')}`,
            missingCodes,
            totalPacked: 0,
            itemCount: 0,
        };
    }

    // If adminOverride, filter out rows with missing codes
    if (missingCodes.length > 0 && adminOverride) {
        const missingSet = new Set(missingCodes);
        rows = rows.filter(r => !missingSet.has(r.code || ''));
        if (rows.length === 0) {
            return { error: 'ไม่มีสินค้าที่ตรงกับในระบบเลย', missingCodes, totalPacked: 0, itemCount: 0 };
        }
    }

    // Size normalization: Excel uses XXL but DB uses 2XL
    const SIZE_MAP: Record<string, string> = {
        'XXL': '2XL',
    };
    const normalizeSize = (s: string | null) => s ? (SIZE_MAP[s] || s) : null;

    // Build lookup maps
    // For products WITH size: "CODE-COLOR-SIZE" → real barcode
    // For products WITHOUT size: "CODE-COLOR" → real barcode
    const lookupMap = new Map<string, string>();
    for (const p of products) {
        if (p.code && p.color && p.size) {
            lookupMap.set(`${p.code}-${p.color}-${p.size}`, p.barcode);
        }
        if (p.code && p.color) {
            // Also map without size for size-less products
            const keyNoSize = `${p.code}-${p.color}`;
            if (!lookupMap.has(keyNoSize)) {
                lookupMap.set(keyNoSize, p.barcode);
            }
        }
    }

    // Map each row to the real barcode
    const mappedRows: { stockRequestId: string; barcode: string; size: string | null; packedQuantity: number; price: number }[] = [];
    const missingBarcodes: string[] = [];

    for (const row of rows) {
        const normSize = normalizeSize(row.size);
        let lookupKey = row.barcode;
        if (row.code && row.color) {
            lookupKey = normSize ? `${row.code}-${row.color}-${normSize}` : `${row.code}-${row.color}`;
        }
        const realBarcode = lookupMap.get(lookupKey);
        if (!realBarcode) {
            missingBarcodes.push(lookupKey);
            continue;
        }
        mappedRows.push({
            stockRequestId: requestId,
            barcode: realBarcode,
            size: normSize,
            packedQuantity: row.packedQuantity,
            price: row.price,
        });
    }

    if (missingBarcodes.length > 0 && !adminOverride) {
        return {
            error: `ไม่พบสินค้าในระบบ: ${missingBarcodes.join(', ')}`,
            missingCodes: missingBarcodes,
            totalPacked: 0,
            itemCount: 0,
        };
    }

    if (mappedRows.length === 0) {
        return { error: 'ไม่มีสินค้าที่ตรงกับในระบบเลย', missingCodes: missingBarcodes, totalPacked: 0, itemCount: 0 };
    }

    // Delete existing allocations and create new ones
    await db.$transaction(async (tx) => {
        await tx.warehouseAllocation.deleteMany({
            where: { stockRequestId: requestId },
        });

        await tx.warehouseAllocation.createMany({
            data: mappedRows,
        });

        await tx.stockRequest.update({
            where: { id: requestId },
            data: { status: 'allocated' },
        });
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'allocation_uploaded',
            details: {
                requestId,
                totalItems: rows.length,
                totalPacked,
                adminOverride,
            },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath('/warehouse/allocation');
    revalidatePath(`/warehouse/allocation/${requestId}`);
    revalidatePath(`/channels/${request.channelId}/packing`);
    return { totalPacked, itemCount: rows.length };
}

export async function updateSingleAllocation(allocationId: string, packedQuantity: number) {
    const allocation = await db.warehouseAllocation.findUnique({
        where: { id: allocationId },
        include: { request: true },
    });

    if (!allocation) throw new Error('Allocation not found');
    if (!['allocated', 'approved'].includes(allocation.request.status)) {
        throw new Error('Cannot edit allocation in current status');
    }

    await db.warehouseAllocation.update({
        where: { id: allocationId },
        data: { packedQuantity },
    });

    revalidatePath(`/channels/${allocation.request.id}/packing`);
    revalidatePath('/warehouse/packing');
    return { success: true };
}

export async function confirmPacking(requestId: string) {
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { allocations: true },
    });

    if (!request) throw new Error('Stock request not found');
    if (request.status !== 'allocated') {
        throw new Error('Stock request must be in allocated status to confirm packing');
    }

    const totalPacked = request.allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

    await db.stockRequest.update({
        where: { id: requestId },
        data: { status: 'packed' },
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'packing_confirmed',
            details: { requestId, totalPacked },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath('/warehouse/packing');
    revalidatePath('/warehouse/shipments');
    revalidatePath(`/channels/${requestId}/packing`);
    revalidatePath(`/channels/${request.channelId}`);
    return { totalPacked };
}

export async function createShipment(
    requestId: string,
    provider: string,
    trackingNumber: string
) {
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { allocations: true },
    });

    if (!request) throw new Error('Stock request not found');
    if (request.status !== 'packed') {
        throw new Error('Stock request must be in packed status to create shipment');
    }

    const totalPacked = request.allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

    await db.$transaction(async (tx) => {
        await tx.shipment.create({
            data: {
                stockRequestId: requestId,
                provider,
                trackingNumber,
                packedTotalQty: totalPacked,
                shippedAt: new Date(),
            },
        });

        await tx.stockRequest.update({
            where: { id: requestId },
            data: { status: 'shipped' },
        });
    });

    await db.channelLog.create({
        data: {
            channelId: request.channelId,
            action: 'shipment_created',
            details: { requestId, provider, trackingNumber, totalPacked },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath('/warehouse/shipments');
    revalidatePath(`/pc/receive`);
    revalidatePath(`/channels/${request.channelId}`);
    return { totalPacked };
}
