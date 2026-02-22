'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============ CREATE STOCK REQUEST ============

export async function createStockRequest(
    channelId: string,
    requestType: 'INITIAL' | 'TOPUP',
    requestedTotalQuantity: number,
    notes?: string
) {
    const request = await db.stockRequest.create({
        data: {
            channelId,
            requestType,
            requestedTotalQuantity,
            status: 'draft',
            notes: notes || null,
        },
    });

    // Log
    await db.channelLog.create({
        data: {
            channelId,
            action: 'stock_request_created',
            details: {
                requestId: request.id,
                requestType,
                requestedTotalQuantity,
            },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels/approvals');
    return request;
}

// ============ SUBMIT STOCK REQUEST ============

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

// ============ APPROVE / REJECT ============

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

// ============ WAREHOUSE: UPLOAD ALLOCATION ============

interface AllocationRow {
    barcode: string;
    size: string | null;
    packedQuantity: number;
    price: number;
}

export async function uploadAllocation(requestId: string, rows: AllocationRow[], adminOverride: boolean = false) {
    const request = await db.stockRequest.findUnique({
        where: { id: requestId },
        include: { allocations: true },
    });

    if (!request) throw new Error('Stock request not found');
    if (!['approved', 'allocated'].includes(request.status)) {
        throw new Error('Stock request must be in approved status to upload allocation');
    }

    // Validate total packed quantity
    const totalPacked = rows.reduce((sum, r) => sum + r.packedQuantity, 0);
    if (totalPacked > request.requestedTotalQuantity && !adminOverride) {
        throw new Error(
            `Total packed quantity (${totalPacked}) exceeds requested quantity (${request.requestedTotalQuantity}). Use admin override to proceed.`
        );
    }

    // Look up all products by code to find real barcodes
    const codeSet = [...new Set(rows.map(r => {
        // row.barcode from Excel is "SR4006-อ่อน-S" format (code-color-size)
        const parts = r.barcode.split('-');
        parts.pop(); // remove size suffix
        parts.pop(); // remove color
        return parts.join('-');
    }))];
    const products = await db.product.findMany({
        where: { code: { in: codeSet } },
    });

    // Check for missing codes
    const existingCodes = new Set(products.map(p => p.code));
    const missingCodes = codeSet.filter(c => !existingCodes.has(c));
    if (missingCodes.length > 0) {
        throw new Error(`Products not found: ${missingCodes.join(', ')}`);
    }

    // Build a map: "CODE-COLOR-SIZE" → real barcode (e.g. "SR4006-อ่อน-S" → "400632")
    const codeSizeToBarcode = new Map<string, string>();
    for (const p of products) {
        if (p.code && p.size && p.color) {
            codeSizeToBarcode.set(`${p.code}-${p.color}-${p.size}`, p.barcode);
        }
    }

    // Map each row to the real barcode
    const mappedRows = rows.map(row => {
        const realBarcode = codeSizeToBarcode.get(row.barcode); // row.barcode = "SR4006-อ่อน-S"
        if (!realBarcode) {
            throw new Error(`ไม่พบสินค้า barcode สำหรับ ${row.barcode} ในระบบ`);
        }
        return {
            stockRequestId: requestId,
            barcode: realBarcode,
            size: row.size,
            packedQuantity: row.packedQuantity,
            price: row.price,
        };
    });

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

// ============ WAREHOUSE: UPDATE SINGLE ALLOCATION ============

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

// ============ WAREHOUSE: CONFIRM PACKING ============

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

// ============ WAREHOUSE: CREATE SHIPMENT ============

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

// ============ PC: CONFIRM RECEIVING (CRITICAL — creates ChannelStock) ============

interface ReceivingItemInput {
    barcode: string;
    allocatedQty: number;
    receivedQty: number;
    remarks?: string;
}

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

// ============ QUERY HELPERS ============

export async function getStockRequestsByChannel(channelId: string) {
    return db.stockRequest.findMany({
        where: { channelId },
        include: {
            allocations: { include: { product: true } },
            shipment: true,
            receiving: { include: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getStockRequest(requestId: string) {
    return db.stockRequest.findUnique({
        where: { id: requestId },
        include: {
            channel: true,
            allocations: {
                include: { product: true },
                orderBy: { createdAt: 'asc' },
            },
            shipment: true,
            receiving: {
                include: {
                    items: { include: { product: true } },
                },
            },
        },
    });
}

export async function getPendingStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'submitted' },
        include: {
            channel: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getApprovedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: { in: ['approved', 'allocated'] } },
        include: {
            channel: true,
            allocations: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getPackedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'packed' },
        include: {
            channel: true,
            allocations: true,
            shipment: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getShippedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'shipped' },
        include: {
            channel: true,
            allocations: { include: { product: true } },
            shipment: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}
