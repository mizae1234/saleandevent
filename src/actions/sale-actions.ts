"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface SaleItemInput {
    barcode: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    isFreebie?: boolean;
}

interface AdjustmentInput {
    description: string;
    amount: number;
}

interface CreateSaleInput {
    channelId?: string;
    items: SaleItemInput[];
    adjustments?: AdjustmentInput[];
    discount?: number;
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

            // 4. สร้าง billCode แบบ {ChannelCode}-{running}
            let billCode: string | null = null;
            if (data.channelId) {
                const channel = await tx.salesChannel.findUnique({
                    where: { id: data.channelId },
                    select: { code: true }
                });

                if (channel?.code) {
                    const existingSalesCount = await tx.sale.count({
                        where: { channelId: data.channelId }
                    });
                    const runningNumber = (existingSalesCount + 1).toString().padStart(4, '0');
                    billCode = `${channel.code}-${runningNumber}`;
                }
            }

            // 5. สร้าง Sale record
            const sale = await tx.sale.create({
                data: {
                    billCode: billCode,
                    channelId: data.channelId || null,
                    totalAmount: totalAmount,
                    discount: data.discount || 0,
                    soldAt: new Date(),
                    createdBy: "00000000-0000-0000-0000-000000000000",
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

                // อัปเดต ChannelStock (หักสต็อก)
                if (data.channelId && !item.isFreebie) {
                    await tx.channelStock.updateMany({
                        where: {
                            channelId: data.channelId,
                            barcode: item.barcode,
                        },
                        data: {
                            soldQuantity: { increment: item.quantity }
                        }
                    });
                }
            }

            // 7. บันทึก ChannelLog (ถ้ามี channelId)
            if (data.channelId) {
                await tx.channelLog.create({
                    data: {
                        channelId: data.channelId,
                        action: 'Sale Recorded',
                        details: {
                            saleId: sale.id,
                            totalAmount: totalAmount,
                            itemCount: data.items.length,
                            adjustments: (data.adjustments || []) as unknown as Prisma.InputJsonValue,
                        },
                        changedBy: "00000000-0000-0000-0000-000000000000",
                    }
                });
            }

            return sale;
        });

        revalidatePath("/pc/pos");
        revalidatePath("/pc/sales");
        if (data.channelId) {
            revalidatePath(`/pc/pos/channel/${data.channelId}`);
        }

        return { success: true, saleId: result.id };
    } catch (error: any) {
        console.error("Failed to create sale:", error);
        throw new Error(`Failed to create sale: ${error.message || error}`);
    }
}

// ดึงรายการขายตาม Channel (เฉพาะ active)
export async function getSalesByChannel(channelId: string) {
    const sales = await db.sale.findMany({
        where: {
            channelId,
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
            channel: true
        }
    });
    return sale;
}

// ยกเลิกบิล
export async function cancelSale(saleId: string, reason: string) {
    try {
        const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
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

            await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: 'cancelled',
                    cancelledAt: new Date(),
                    cancelledBy: "00000000-0000-0000-0000-000000000000",
                    cancelReason: reason
                }
            });

            // คืนสต็อก
            if (sale.channelId) {
                for (const item of sale.items) {
                    if (!item.isFreebie) {
                        await tx.channelStock.updateMany({
                            where: {
                                channelId: sale.channelId,
                                barcode: item.barcode,
                            },
                            data: {
                                soldQuantity: { decrement: item.quantity }
                            }
                        });
                    }
                }

                await tx.channelLog.create({
                    data: {
                        channelId: sale.channelId,
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
        if (result.channelId) {
            revalidatePath(`/pc/sales/channel/${result.channelId}`);
            revalidatePath(`/pc/pos/channel/${result.channelId}`);
            revalidatePath(`/channel/${result.channelId}/pos/sales`);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Failed to cancel sale:", error);
        throw new Error(`Failed to cancel sale: ${error.message || error}`);
    }
}

// ดึง Active Channels สำหรับหน้าเลือก
export async function getActiveChannelsWithSales() {
    const channels = await db.salesChannel.findMany({
        where: {
            status: { in: ['selling', 'approved', 'packing', 'shipped', 'received', 'active'] }
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
        orderBy: { createdAt: 'desc' }
    });
    return channels;
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
            channel: true
        },
        orderBy: { soldAt: 'desc' },
        take: limit
    });
    return sales;
}
