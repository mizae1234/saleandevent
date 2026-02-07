"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

// ============ Helper Functions ============

/**
 * Generate auto event code: EV-YYYYMM-XXX
 */
async function generateEventCode(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `EV-${yearMonth}-`;

    const latestEvent = await db.event.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
        select: { code: true }
    });

    let nextNumber = 1;
    if (latestEvent?.code) {
        const lastNumber = parseInt(latestEvent.code.split('-')[2], 10);
        if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

// ============ Types for Form Data ============

export type StaffSelection = {
    staffId: string;
    isMain: boolean;
};

export type ProductRequestItem = {
    barcode: string;
    quantity: number;
};

// ============ Server Actions (Mutations Only) ============

/**
 * Create Event with Staff and Stock Requests
 * This is the main server action for creating a new event
 */
export async function createEventWithDetails(formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const staffJson = formData.get("staff") as string;
    const productsJson = formData.get("products") as string;
    const equipmentJson = formData.get("equipment") as string;
    const submitType = formData.get("submitType") as string; // 'draft' or 'submit'

    if (!name || !location || !startDate || !endDate) {
        throw new Error("Missing required fields");
    }

    // Parse JSON data
    const staffList: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];
    const productItems: ProductRequestItem[] = productsJson ? JSON.parse(productsJson) : [];
    const equipmentItems: ProductRequestItem[] = equipmentJson ? JSON.parse(equipmentJson) : [];

    // Auto-generate event code
    const code = await generateEventCode();
    const status = submitType === 'submit' ? 'pending_approval' : 'draft';

    try {
        // Create event with staff and stock request in transaction
        const event = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Create Event
            const newEvent = await tx.event.create({
                data: {
                    name,
                    code,
                    location,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    status,

                },
            });

            // 2. Assign Staff
            if (staffList.length > 0) {
                await tx.eventStaff.createMany({
                    data: staffList.map(s => ({
                        eventId: newEvent.id,
                        staffId: s.staffId,
                        // Workaround: isMain not recognized by running server
                        // isMain: s.isMain,
                        role: s.isMain ? 'Head' : 'PC'
                    }))
                });
            }

            // 3. Create Stock Request for Products
            if (productItems.length > 0) {
                const stockRequest = await tx.stockRequest.create({
                    data: {
                        eventId: newEvent.id,
                        status: 'pending',

                    }
                });

                // Fetch product names for reference
                const productBarcodes = productItems.map((p: ProductRequestItem) => p.barcode);
                const productDetails = await tx.product.findMany({
                    where: { barcode: { in: productBarcodes } },
                    select: { barcode: true, name: true, size: true }
                });
                const productMap = new Map(productDetails.map((p: { barcode: string, name: string, size: string | null }) => [p.barcode, p]));

                await tx.stockRequestItem.createMany({
                    data: productItems.map((item: ProductRequestItem) => ({
                        requestId: stockRequest.id,
                        barcode: item.barcode,
                        productName: productMap.get(item.barcode)?.name || '',
                        size: productMap.get(item.barcode)?.size,
                        quantity: item.quantity,
                    }))
                });
            }

            // 4. Create Stock Request for Equipment (separate request)
            if (equipmentItems.length > 0) {
                const equipmentRequest = await tx.stockRequest.create({
                    data: {
                        eventId: newEvent.id,
                        status: 'pending',

                    }
                });

                const equipmentBarcodes = equipmentItems.map((p: ProductRequestItem) => p.barcode);
                const equipmentDetails = await tx.product.findMany({
                    where: { barcode: { in: equipmentBarcodes } },
                    select: { barcode: true, name: true, size: true }
                });
                const equipmentMap = new Map(equipmentDetails.map((p: { barcode: string, name: string, size: string | null }) => [p.barcode, p]));

                await tx.stockRequestItem.createMany({
                    data: equipmentItems.map((item: ProductRequestItem) => ({
                        requestId: equipmentRequest.id,
                        barcode: item.barcode,
                        productName: equipmentMap.get(item.barcode)?.name || '',
                        size: equipmentMap.get(item.barcode)?.size,
                        quantity: item.quantity,
                    }))
                });
            }

            // 5. Create Event Log
            await tx.eventLog.create({
                data: {
                    eventId: newEvent.id,
                    action: status === 'pending_approval' ? 'Submit' : 'Create',
                    details: {
                        name,
                        location,
                        startDate,
                        endDate,
                        code,
                        staffCount: staffList.length,
                        productCount: productItems.length,
                        equipmentCount: equipmentItems.length
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });

            return newEvent;
        });

        revalidatePath("/events");
        return { success: true, eventId: event.id };

    } catch (error: any) {
        console.error("Failed to create event:", error);
        // Throw detailed error for debugging
        throw new Error(`Failed to create event: ${error.message || error}`);
    }
}

/**
 * Simple create for backwards compatibility
 */
export async function createEvent(formData: FormData) {
    await createEventWithDetails(formData);
    redirect("/events");
}

/**
 * Approve an event - changes status to 'packing' (ready for packing)
 */
export async function approveEvent(eventId: string) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update event status to packing
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'packing' }
            });

            // Log the approval
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Approve',
                    details: { approvedAt: new Date().toISOString(), nextStatus: 'packing' },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });

            // Update stock requests to approved
            await tx.stockRequest.updateMany({
                where: { eventId },
                data: {
                    status: 'approved',
                    approvedAt: new Date(),
                    approvedBy: 'System'
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        revalidatePath("/events/packing");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to approve event:", error);
        throw new Error(`Failed to approve event: ${error.message || error}`);
    }
}

/**
 * Complete packing - changes status to 'packed' and prepares for shipping
 */
/**
 * Complete packing - changes status to 'packed' and prepares for shipping
 * Now accepts the actual packed quantities for each item
 */
export async function completePacking(eventId: string, packingData?: Array<{ itemId: string, packedQuantity: number }>) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. If packing data is provided, update stock request items
            if (packingData && packingData.length > 0) {
                for (const item of packingData) {
                    await tx.stockRequestItem.update({
                        where: { id: item.itemId },
                        data: { packedQuantity: item.packedQuantity }
                    });
                }
            }

            // 2. Update event status
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'packed' }
            });

            // 3. Log the packing completion
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Packing Complete',
                    details: {
                        packedAt: new Date().toISOString(),
                        itemCount: packingData?.length || 0
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events/packing");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to complete packing:", error);
        throw new Error(`Failed to complete packing: ${error.message || error}`);
    }
}

/**
 * Generate delivery note number: DN-YYYYMMDD-XXX
 */
async function generateDeliveryNoteNumber(): Promise<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = `DN-${dateStr}-`;

    const latest = await db.deliveryNote.findFirst({
        where: { deliveryNoteNumber: { startsWith: prefix } },
        orderBy: { deliveryNoteNumber: 'desc' },
        select: { deliveryNoteNumber: true }
    });

    let nextNumber = 1;
    if (latest?.deliveryNoteNumber) {
        const lastNumber = parseInt(latest.deliveryNoteNumber.split('-')[2], 10);
        if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Create shipment - creates delivery note and changes status to 'shipped'
 */
export async function createShipment(eventId: string, shipmentData: { provider?: string; trackingNo?: string }) {
    try {
        const deliveryNoteNumber = await generateDeliveryNoteNumber();

        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Get the first stock request for this event (for linking)
            const stockRequest = await tx.stockRequest.findFirst({
                where: { eventId }
            });

            // Create delivery note
            await tx.deliveryNote.create({
                data: {
                    eventId,
                    stockRequestId: stockRequest?.id,
                    deliveryNoteNumber,
                    status: 'dispatched',
                    dispatchedAt: new Date(),
                }
            });

            // Update event status to shipped
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'shipped' }
            });

            // Update stock request with shipping info
            if (stockRequest) {
                await tx.stockRequest.update({
                    where: { id: stockRequest.id },
                    data: {
                        shipmentProvider: shipmentData.provider,
                        trackingNo: shipmentData.trackingNo,
                        shippedAt: new Date()
                    }
                });
            }

            // Log the shipment
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Shipped',
                    details: {
                        deliveryNoteNumber,
                        provider: shipmentData.provider,
                        trackingNo: shipmentData.trackingNo,
                        shippedAt: new Date().toISOString()
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events/packing");
        revalidatePath("/events");
        return { success: true, deliveryNoteNumber };
    } catch (error: any) {
        console.error("Failed to create shipment:", error);
        throw new Error(`Failed to create shipment: ${error.message || error}`);
    }
}

/**
 * Complete receiving - updates receivedQuantity and changes status to 'received' or 'active'
 */
export async function completeReceiving(eventId: string, receivingData: Array<{ itemId: string, receivedQuantity: number }>) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Update stock request items with received quantities
            if (receivingData && receivingData.length > 0) {
                for (const item of receivingData) {
                    await tx.stockRequestItem.update({
                        where: { id: item.itemId },
                        data: { receivedQuantity: item.receivedQuantity }
                    });
                }
            }

            // 2. Update event status to 'active' (ready to sell)
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'active' }
            });

            // 3. Update EventStock with received quantities
            const stockRequests = await tx.stockRequest.findMany({
                where: { eventId },
                include: { items: true }
            });

            for (const request of stockRequests) {
                for (const item of request.items) {
                    // Find matching receiving data or use current receivedQuantity
                    const receivedItem = receivingData.find(r => r.itemId === item.id);
                    const qty = receivedItem?.receivedQuantity ?? item.receivedQuantity ?? 0;

                    if (qty > 0) {
                        // Upsert EventStock
                        await tx.eventStock.upsert({
                            where: {
                                eventId_barcode: {
                                    eventId,
                                    barcode: item.barcode
                                }
                            },
                            create: {
                                eventId,
                                barcode: item.barcode,
                                quantity: qty
                            },
                            update: {
                                quantity: { increment: qty }
                            }
                        });
                    }
                }
            }

            // 4. Log the receiving completion
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Goods Received',
                    details: {
                        receivedAt: new Date().toISOString(),
                        itemCount: receivingData?.length || 0
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/pc/receive");
        revalidatePath("/events");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to complete receiving:", error);
        throw new Error(`Failed to complete receiving: ${error.message || error}`);
    }
}

/**
 * Reject an event - changes status back to 'draft' with reason
 */
export async function rejectEvent(eventId: string, reason: string) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update event status back to draft
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'draft' }
            });

            // Log the rejection
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Reject',
                    details: { reason, rejectedAt: new Date().toISOString() },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });

            // Update stock requests to rejected
            await tx.stockRequest.updateMany({
                where: { eventId },
                data: {
                    status: 'rejected',
                    rejectedAt: new Date(),
                    rejectedBy: reason
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to reject event:", error);
        throw new Error(`Failed to reject event: ${error.message || error}`);
    }
}

/**
 * Update Event with Staff and Stock Requests
 */
export async function updateEventWithDetails(eventId: string, formData: FormData) {
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;
    const staffJson = formData.get("staff") as string;
    const productsJson = formData.get("products") as string;
    const equipmentJson = formData.get("equipment") as string;
    const submitType = formData.get("submitType") as string;

    if (!name || !location || !startDate || !endDate) {
        throw new Error("Missing required fields");
    }

    const staffList: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];
    const productItems: ProductRequestItem[] = productsJson ? JSON.parse(productsJson) : [];
    const equipmentItems: ProductRequestItem[] = equipmentJson ? JSON.parse(equipmentJson) : [];

    const status = submitType === 'submit' ? 'pending_approval' : 'draft';

    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Update Event basic info
            await tx.event.update({
                where: { id: eventId },
                data: {
                    name,
                    location,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    status,
                },
            });

            // 2. Delete existing staff assignments and recreate
            await tx.eventStaff.deleteMany({ where: { eventId } });
            if (staffList.length > 0) {
                await tx.eventStaff.createMany({
                    data: staffList.map(s => ({
                        eventId,
                        staffId: s.staffId,
                        role: s.isMain ? 'Head' : 'PC'
                    }))
                });
            }

            // 3. Delete existing stock requests and items, then recreate
            await tx.stockRequestItem.deleteMany({
                where: { request: { eventId } }
            });
            await tx.stockRequest.deleteMany({ where: { eventId } });

            // 4. Create new product stock request
            if (productItems.length > 0) {
                const productBarcodes = productItems.map(p => p.barcode);
                const productData = await tx.product.findMany({
                    where: { barcode: { in: productBarcodes } }
                });
                const productMap = new Map(productData.map(p => [p.barcode, p]));

                const stockRequest = await tx.stockRequest.create({
                    data: {
                        eventId,
                        status: 'pending',
                    }
                });

                await tx.stockRequestItem.createMany({
                    data: productItems.map((item: ProductRequestItem) => ({
                        requestId: stockRequest.id,
                        barcode: item.barcode,
                        productName: productMap.get(item.barcode)?.name || '',
                        size: productMap.get(item.barcode)?.size,
                        quantity: item.quantity,
                    }))
                });
            }

            // 5. Create equipment stock request
            if (equipmentItems.length > 0) {
                const equipmentBarcodes = equipmentItems.map(e => e.barcode);
                const equipmentData = await tx.product.findMany({
                    where: { barcode: { in: equipmentBarcodes } }
                });
                const equipmentMap = new Map(equipmentData.map(e => [e.barcode, e]));

                const equipmentRequest = await tx.stockRequest.create({
                    data: {
                        eventId,
                        status: 'pending',
                    }
                });

                await tx.stockRequestItem.createMany({
                    data: equipmentItems.map((item: ProductRequestItem) => ({
                        requestId: equipmentRequest.id,
                        barcode: item.barcode,
                        productName: equipmentMap.get(item.barcode)?.name || '',
                        size: equipmentMap.get(item.barcode)?.size,
                        quantity: item.quantity,
                    }))
                });
            }

            // 6. Log the update
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Update',
                    details: {
                        name,
                        location,
                        startDate,
                        endDate,
                        staffCount: staffList.length,
                        productCount: productItems.length,
                        equipmentCount: equipmentItems.length
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        return { success: true, eventId };

    } catch (error: any) {
        console.error("Failed to update event:", error);
        throw new Error(`Failed to update event: ${error.message || error}`);
    }
}

/**
 * Close an event - changes status to 'completed' (End of lifecycle)
 */
export async function closeEvent(eventId: string) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update event status to completed
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'completed' }
            });

            // Log the completion
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Close Event',
                    details: { closedAt: new Date().toISOString() },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to close event:", error);
        throw new Error(`Failed to close event: ${error.message || error}`);
    }
}

/**
 * Close event stock - creates ReturnSummary with damaged/missing items
 * Changes status from 'active' to 'pending_return'
 */
export async function closeEventStock(
    eventId: string,
    items: { barcode: string; damaged: number; missing: number }[]
) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Get event stock with sales data
            const event = await tx.event.findUnique({
                where: { id: eventId },
                include: {
                    stock: true,
                    sales: {
                        where: { status: 'active' },
                        include: { items: true }
                    }
                }
            });

            if (!event) throw new Error("ไม่พบ Event");
            if (event.status !== 'active') throw new Error("Event นี้ไม่สามารถปิดยอดได้");

            // 2. Calculate sold quantities
            const soldByBarcode = new Map<string, number>();
            event.sales.forEach(sale => {
                sale.items.forEach(item => {
                    const current = soldByBarcode.get(item.barcode) || 0;
                    soldByBarcode.set(item.barcode, current + item.quantity);
                });
            });

            // 3. Create ReturnSummary
            const returnSummary = await tx.returnSummary.create({
                data: {
                    eventId,
                    submittedAt: new Date()
                }
            });

            // 4. Create ReturnItems
            for (const stock of event.stock) {
                const itemData = items.find(i => i.barcode === stock.barcode) || { damaged: 0, missing: 0 };
                const soldQty = soldByBarcode.get(stock.barcode) || 0;
                const remainingQty = stock.quantity - soldQty - itemData.damaged - itemData.missing;

                await tx.returnItem.create({
                    data: {
                        returnSummaryId: returnSummary.id,
                        barcode: stock.barcode,
                        soldQuantity: soldQty,
                        remainingQuantity: remainingQty,
                        damagedQuantity: itemData.damaged,
                        missingQuantity: itemData.missing
                    }
                });
            }

            // 5. Update event status
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'pending_return' }
            });

            // 6. Log the action
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Stock Closed',
                    details: {
                        closedAt: new Date().toISOString(),
                        returnSummaryId: returnSummary.id,
                        totalItems: event.stock.length,
                        totalDamaged: items.reduce((sum, i) => sum + i.damaged, 0),
                        totalMissing: items.reduce((sum, i) => sum + i.missing, 0)
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        revalidatePath("/pc/close");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to close event stock:", error);
        throw new Error(`Failed to close event stock: ${error.message || error}`);
    }
}

/**
 * Create return shipment - changes status from 'pending_return' to 'returning'
 */
export async function createReturnShipment(
    eventId: string,
    shipmentData: { provider: string; trackingNo?: string }
) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Verify event is pending return
            const event = await tx.event.findUnique({
                where: { id: eventId }
            });

            if (!event) throw new Error("ไม่พบ Event");
            if (event.status !== 'pending_return') {
                throw new Error("Event นี้ไม่อยู่ในสถานะรอส่งคืน");
            }

            // Update event status
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'returning' }
            });

            // Log the shipment
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Return Shipped',
                    details: {
                        shippedAt: new Date().toISOString(),
                        provider: shipmentData.provider,
                        trackingNo: shipmentData.trackingNo
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        revalidatePath("/pc/close");
        revalidatePath("/warehouse/return");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to create return shipment:", error);
        throw new Error(`Failed to create return shipment: ${error.message || error}`);
    }
}

/**
 * Confirm return received - adds stock back to warehouse and completes event
 */
export async function confirmReturnReceived(eventId: string) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Get event and return summary
            const event = await tx.event.findUnique({
                where: { id: eventId },
                include: {
                    returnSummaries: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: { items: true }
                    }
                }
            });

            if (!event) throw new Error("ไม่พบ Event");
            if (event.status !== 'returning') {
                throw new Error("Event นี้ไม่อยู่ในสถานะกำลังส่งคืน");
            }

            const returnSummary = event.returnSummaries[0];
            if (!returnSummary) throw new Error("ไม่พบรายการส่งคืน");

            // 2. Add remaining quantities back to warehouse stock
            for (const item of returnSummary.items) {
                if (item.remainingQuantity > 0) {
                    await tx.warehouseStock.upsert({
                        where: { barcode: item.barcode },
                        create: {
                            barcode: item.barcode,
                            quantity: item.remainingQuantity
                        },
                        update: {
                            quantity: { increment: item.remainingQuantity }
                        }
                    });
                }
            }

            // 3. Update return summary
            await tx.returnSummary.update({
                where: { id: returnSummary.id },
                data: {
                    confirmedAt: new Date(),
                    confirmedBy: 'Warehouse'
                }
            });

            // 4. Clear event stock (since returned)
            await tx.eventStock.deleteMany({
                where: { eventId }
            });

            // 5. Update event status to returned (wait for admin to close)
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'returned' }
            });

            // 6. Log the action
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Return Received',
                    details: {
                        receivedAt: new Date().toISOString(),
                        totalItemsReturned: returnSummary.items.reduce((sum, i) => sum + i.remainingQuantity, 0)
                    },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        revalidatePath("/warehouse/return");
        revalidatePath("/warehouse/stock");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to confirm return:", error);
        throw new Error(`Failed to confirm return: ${error.message || error}`);
    }
}

/**
 * Manually close event (Admin only) - Final step after expenses are cleared
 */
export async function closeEventManual(eventId: string) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // Verify event is returned
            const event = await tx.event.findUnique({
                where: { id: eventId }
            });

            if (!event) throw new Error("ไม่พบ Event");
            if (event.status !== 'returned') {
                throw new Error("Event ต้องอยู่ในสถานะ 'Returned' ถึงจะปิดงานได้");
            }

            // Update event status to completed
            await tx.event.update({
                where: { id: eventId },
                data: { status: 'completed' }
            });

            // Log the completion
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Event Closed (Manual)',
                    details: { closedAt: new Date().toISOString() },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to close event:", error);
        throw new Error(`Failed to close event: ${error.message || error}`);
    }
}
/**
 * Add expense to event
 */
export async function addEventExpense(
    eventId: string,
    data: {
        category: string;
        amount: number;
        description: string;
    }
) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.eventExpense.create({
                data: {
                    eventId,
                    category: data.category,
                    amount: data.amount,
                    description: data.description,
                    status: 'approved', // Auto approve for now as requested by PC/Responsible person
                    createdBy: "00000000-0000-0000-0000-000000000000"
                }
            });

            // Log
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Add Expense',
                    details: { ...data, addedAt: new Date().toISOString() },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to add expense:", error);
        throw new Error(`Failed to add expense: ${error.message || error}`);
    }
}

/**
 * Remove expense from event
 */
export async function removeEventExpense(
    expenseId: string,
    eventId: string
) {
    try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.eventExpense.delete({
                where: { id: expenseId }
            });

            // Log
            await tx.eventLog.create({
                data: {
                    eventId,
                    action: 'Remove Expense',
                    details: { expenseId, removedAt: new Date().toISOString() },
                    changedBy: "00000000-0000-0000-0000-000000000000",
                }
            });
        });

        revalidatePath(`/events/${eventId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Failed to remove expense:", error);
        throw new Error(`Failed to remove expense: ${error.message || error}`);
    }
}
