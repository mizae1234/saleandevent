"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * ดึงรายการคำขอเบิกสินค้าทั้งหมดของ Event ที่กำลัง active
 */
export async function getRefillRequests(eventId?: string) {
    const where = eventId ? { eventId } : {};

    const requests = await db.stockRequest.findMany({
        where,
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                    status: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return requests;
}

/**
 * ดึงรายละเอียดคำขอเบิกตาม ID
 */
export async function getRefillRequestById(id: string) {
    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                    status: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                            price: true,
                        }
                    }
                }
            }
        }
    });

    return request;
}

/**
 * สร้างคำขอเบิกสินค้าใหม่
 */
export async function createRefillRequest(
    eventId: string,
    items: { barcode: string; quantity: number }[]
) {
    // Validate event exists and is active
    const event = await db.event.findUnique({
        where: { id: eventId }
    });

    if (!event) {
        throw new Error("ไม่พบ Event");
    }

    if (event.status !== 'active') {
        throw new Error("Event นี้ไม่ได้อยู่ในสถานะ Active");
    }

    // Create the request with items
    const request = await db.stockRequest.create({
        data: {
            eventId,
            status: 'pending',
            items: {
                create: items.map(item => ({
                    barcode: item.barcode,
                    quantity: item.quantity,
                }))
            }
        },
        include: {
            items: true
        }
    });

    revalidatePath('/pc/refill');
    revalidatePath('/warehouse/packing');

    return request;
}

/**
 * ดึง Events ที่ Active สำหรับ Dropdown
 */
export async function getActiveEventsForRefill() {
    const events = await db.event.findMany({
        where: {
            status: 'active'
        },
        select: {
            id: true,
            name: true,
            code: true,
            location: true,
        },
        orderBy: { name: 'asc' }
    });

    return events;
}
