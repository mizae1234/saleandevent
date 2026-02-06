"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface SaleItemInput {
    barcode: string;
    quantity: number;
    unitPrice: number;
    discount?: number; // ส่วนลดรายชิ้น
    isFreebie?: boolean;
}

interface AdjustmentInput {
    description: string;
    amount: number; // บวก/ลบ
}

interface CreateSaleInput {
    eventId?: string;
    branchId?: string;
    items: SaleItemInput[];
    adjustments?: AdjustmentInput[];
    discount?: number; // ส่วนลดท้ายบิล
}

export async function createSale(data: CreateSaleInput) {
    try {
        const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. คำนวณยอดรวม
            let subtotal = 0;
            for (const item of data.items) {
                const itemTotal = (item.unitPrice - (item.discount || 0)) * item.quantity;
                subtotal += itemTotal;
            }

            // 2. คำนวณ adjustments (add-on)
            let adjustmentTotal = 0;
            if (data.adjustments) {
                for (const adj of data.adjustments) {
                    adjustmentTotal += adj.amount;
                }
            }

            // 3. คำนวณยอดสุทธิ
            const totalAmount = subtotal + adjustmentTotal - (data.discount || 0);

            // 4. สร้าง billCode แบบ {EventCode}-{running}
            let billCode: string | null = null;
            if (data.eventId) {
                const event = await tx.event.findUnique({
                    where: { id: data.eventId },
                    select: { code: true }
                });

                if (event?.code) {
                    // นับจำนวน sales ที่มีอยู่แล้วใน event นี้
                    const existingSalesCount = await tx.sale.count({
                        where: { eventId: data.eventId }
                    });
                    const runningNumber = (existingSalesCount + 1).toString().padStart(4, '0');
                    billCode = `${event.code}-${runningNumber}`;
                }
            }

            // 5. สร้าง Sale record
            const sale = await tx.sale.create({
                data: {
                    billCode: billCode,
                    eventId: data.eventId || null,
                    branchId: data.branchId || null,
                    totalAmount: totalAmount,
                    discount: data.discount || 0,
                    soldAt: new Date(),
                    createdBy: "00000000-0000-0000-0000-000000000000", // TODO: ใช้ user จริง
                }
            });

            // 6. สร้าง SaleItem records
            for (const item of data.items) {
                const itemTotal = (item.unitPrice - (item.discount || 0)) * item.quantity;

                await tx.saleItem.create({
                    data: {
                        saleId: sale.id,
                        barcode: item.barcode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice - (item.discount || 0),
                        totalAmount: itemTotal,
                        isFreebie: item.isFreebie || false,
                        createdBy: "00000000-0000-0000-0000-000000000000",
                    }
                });

                // 6. อัปเดต EventStock (หักสต็อก)
                if (data.eventId && !item.isFreebie) {
                    await tx.eventStock.updateMany({
                        where: {
                            eventId: data.eventId,
                            barcode: item.barcode,
                        },
                        data: {
                            soldQuantity: { increment: item.quantity }
                        }
                    });
                }
            }

            // 7. บันทึก EventLog (ถ้าเป็น Event sale)
            if (data.eventId) {
                await tx.eventLog.create({
                    data: {
                        eventId: data.eventId,
                        action: 'Sale Recorded',
                        details: {
                            saleId: sale.id,
                            totalAmount: totalAmount,
                            itemCount: data.items.length,
                            adjustments: data.adjustments || [],
                        },
                        changedBy: "00000000-0000-0000-0000-000000000000",
                    }
                });
            }

            return sale;
        });

        revalidatePath("/pc/pos");
        revalidatePath("/pc/sales");
        if (data.eventId) {
            revalidatePath(`/pc/pos/event/${data.eventId}`);
        }

        return { success: true, saleId: result.id };
    } catch (error: any) {
        console.error("Failed to create sale:", error);
        throw new Error(`Failed to create sale: ${error.message || error}`);
    }
}

// ดึงรายการขายตาม Event (เฉพาะ active)
export async function getSalesByEvent(eventId: string) {
    const sales = await db.sale.findMany({
        where: {
            eventId,
            status: 'active'
        },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { soldAt: 'desc' }
    });
    return sales;
}

// ดึงรายละเอียดบิล
export async function getSaleById(saleId: string) {
    const sale = await db.sale.findUnique({
        where: { id: saleId },
        include: {
            items: {
                include: {
                    product: true
                }
            },
            event: true
        }
    });
    return sale;
}

// ยกเลิกบิล
export async function cancelSale(saleId: string, reason: string) {
    try {
        const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. ดึงข้อมูลบิล
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { items: true }
            });

            if (!sale) {
                throw new Error('Sale not found');
            }

            if (sale.status === 'cancelled') {
                throw new Error('Sale is already cancelled');
            }

            // 2. อัปเดต status เป็น cancelled
            await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelledBy: "00000000-0000-0000-0000-000000000000", // TODO: ใช้ user จริง
                    cancelReason: reason
                }
            });

            // 3. คืนสต็อก (ถ้าเป็น Event sale)
            if (sale.eventId) {
                for (const item of sale.items) {
                    if (!item.isFreebie) {
                        await tx.eventStock.updateMany({
                            where: {
                                eventId: sale.eventId,
                                barcode: item.barcode,
                            },
                            data: {
                                soldQuantity: { decrement: item.quantity }
                            }
                        });
                    }
                }

                // 4. บันทึก EventLog
                await tx.eventLog.create({
                    data: {
                        eventId: sale.eventId,
                        action: 'Sale Cancelled',
                        details: {
                            saleId: saleId,
                            totalAmount: parseFloat(sale.totalAmount.toString()),
                            reason: reason,
                            itemCount: sale.items.length
                        },
                        changedBy: "00000000-0000-0000-0000-000000000000",
                    }
                });
            }

            return sale;
        });

        revalidatePath("/pc/sales");
        if (result.eventId) {
            revalidatePath(`/pc/sales/event/${result.eventId}`);
            revalidatePath(`/pc/pos/event/${result.eventId}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Failed to cancel sale:", error);
        throw new Error(`Failed to cancel sale: ${error.message || error}`);
    }
}

// ดึง Active Events สำหรับหน้าเลือก
export async function getActiveEventsWithSales() {
    const events = await db.event.findMany({
        where: {
            status: { in: ['selling', 'approved', 'packing', 'shipped', 'received'] }
        },
        include: {
            sales: {
                where: { status: 'active' },
                select: {
                    id: true,
                    totalAmount: true,
                    soldAt: true
                }
            },
            _count: {
                select: {
                    sales: { where: { status: 'active' } }
                }
            }
        },
        orderBy: { startDate: 'desc' }
    });
    return events;
}

// ดึงรายการขายทั้งหมด
export async function getAllSales(limit: number = 50) {
    const sales = await db.sale.findMany({
        where: { status: 'active' },
        include: {
            items: {
                include: {
                    product: true
                }
            },
            event: true
        },
        orderBy: { soldAt: 'desc' },
        take: limit
    });
    return sales;
}
