'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";

export async function adminUpdateStockRequest(
    requestId: string,
    items: { barcode: string; quantity: number; notes?: string }[]
) {
    const session = await getSession();
    if (!session || !session.staffId) throw new Error("Unauthorized");

    const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'WAREHOUSE'];
    if (!ALLOWED_ROLES.includes(session.role)) {
        throw new Error("คุณไม่มีสิทธิ์แก้ไขรายการเบิก");
    }

    await db.$transaction(async (tx) => {
        // Fetch existing request to capture snapshot
        const existingRequest = await tx.stockRequest.findUnique({
            where: { id: requestId },
            include: { items: true }
        });

        if (!existingRequest) {
            throw new Error("Stock Request not found");
        }

        // Snapshot existing
        const oldSnapshot = existingRequest.items.map(i => ({ barcode: i.barcode, quantity: i.quantity }));
        const newSnapshot = items.map(i => ({ barcode: i.barcode, quantity: i.quantity }));

        // Delete old items
        await tx.stockRequestItem.deleteMany({
            where: { stockRequestId: requestId }
        });

        // Create new items
        if (items.length > 0) {
            await tx.stockRequestItem.createMany({
                data: items.map(item => ({
                    stockRequestId: requestId,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    notes: item.notes
                }))
            });
        }

        // Update total quantity
        const newTotal = items.reduce((sum, item) => sum + item.quantity, 0);
        await tx.stockRequest.update({
            where: { id: requestId },
            data: { 
                requestedTotalQuantity: newTotal,
                updatedBy: session.staffId
            }
        });

        // Insert log
        await tx.stockRequestLog.create({
            data: {
                stockRequestId: requestId,
                action: 'ADMIN_EDITED',
                details: `Admin (ID: ${session.staffId}, Name: ${session.name}) edited request items from ${existingRequest.requestedTotalQuantity} to ${newTotal} total Quantity.`,
                snapshot: {
                    before: oldSnapshot,
                    after: newSnapshot
                },
                createdBy: session.staffId
            }
        });
    });

    // Revalidate relevant pages
    revalidatePath(`/warehouse/allocate/${requestId}`);
    revalidatePath(`/warehouse/allocate/${requestId}/edit-request`);
}
