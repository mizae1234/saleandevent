'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============ Helper Functions ============

// Generate auto channel code based on type:
// EVENT → EV-YYYYMM-XXX
// BRANCH → BR-XXX
async function generateChannelCode(type: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (type === 'EVENT') {
        const prefix = `EV-${yearMonth}-`;
        const lastChannel = await db.salesChannel.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
        });
        const lastNum = lastChannel ? parseInt(lastChannel.code.replace(prefix, '')) : 0;
        return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
    } else {
        const prefix = 'BR-';
        const lastChannel = await db.salesChannel.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
        });
        const lastNum = lastChannel ? parseInt(lastChannel.code.replace(prefix, '')) : 0;
        return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
    }
}

// ============ Types ============

interface StaffSelection {
    staffId: string;
    isMain: boolean;
}

// ============ CREATE CHANNEL ============

export async function createChannelWithDetails(formData: FormData) {
    const type = formData.get('type') as string || 'EVENT';
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;
    const salesTarget = formData.get('salesTarget') as string | null;
    const responsiblePersonName = formData.get('responsiblePersonName') as string | null;
    const phone = formData.get('phone') as string | null;
    const staffJson = formData.get('staff') as string | null;
    const initialQty = formData.get('initialQuantity') as string | null;
    const notes = formData.get('notes') as string | null;

    const code = await generateChannelCode(type);
    const staff: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];

    let channel;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel = await db.$transaction(async (tx: any) => {
            // 1. Create channel
            const ch = await tx.salesChannel.create({
                data: {
                    code,
                    type,
                    name,
                    location,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    salesTarget: salesTarget ? parseFloat(salesTarget) : null,
                    responsiblePersonName: responsiblePersonName || null,
                    phone: phone || null,
                    status: 'draft',
                },
            });

            // 2. Assign staff
            if (staff.length > 0) {
                await tx.channelStaff.createMany({
                    data: staff.map(s => ({
                        channelId: ch.id,
                        staffId: s.staffId,
                        isMain: s.isMain,
                    })),
                });
            }

            // 3. Create initial stock request if quantity provided
            if (initialQty && parseInt(initialQty) > 0) {
                await tx.stockRequest.create({
                    data: {
                        channelId: ch.id,
                        requestType: 'INITIAL',
                        requestedTotalQuantity: parseInt(initialQty),
                        status: 'submitted',
                        notes: notes || null,
                    },
                });
            }

            // 4. Log
            await tx.channelLog.create({
                data: {
                    channelId: ch.id,
                    action: 'channel_created',
                    details: {
                        type, name, location,
                        staffCount: staff.length,
                        initialQty: initialQty ? parseInt(initialQty) : 0,
                    },
                    changedBy: '00000000-0000-0000-0000-000000000000',
                },
            });

            return ch;
        });
    } catch (error) {
        console.error('[createChannelWithDetails] Error:', error);
        throw error;
    }

    revalidatePath('/channels');
    revalidatePath('/channels/approvals');
    redirect(`/channels/${channel.id}`);
}

// ============ UPDATE CHANNEL ============

export async function updateChannelWithDetails(channelId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;
    const salesTarget = formData.get('salesTarget') as string | null;
    const responsiblePersonName = formData.get('responsiblePersonName') as string | null;
    const phone = formData.get('phone') as string | null;
    const staffJson = formData.get('staff') as string | null;

    const staff: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // 1. Update channel
        await tx.salesChannel.update({
            where: { id: channelId },
            data: {
                name,
                location,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                salesTarget: salesTarget ? parseFloat(salesTarget) : null,
                responsiblePersonName: responsiblePersonName || null,
                phone: phone || null,
            },
        });

        // 2. Sync staff
        await tx.channelStaff.deleteMany({ where: { channelId } });
        if (staff.length > 0) {
            await tx.channelStaff.createMany({
                data: staff.map(s => ({
                    channelId,
                    staffId: s.staffId,
                    isMain: s.isMain,
                })),
            });
        }

        // 3. Update stock request quantity if provided
        const initialQuantity = formData.get('initialQuantity') as string | null;
        if (initialQuantity && parseInt(initialQuantity) > 0) {
            const qty = parseInt(initialQuantity);
            // Find existing INITIAL request
            const existingRequest = await tx.stockRequest.findFirst({
                where: { channelId, requestType: 'INITIAL' },
            });
            if (existingRequest) {
                await tx.stockRequest.update({
                    where: { id: existingRequest.id },
                    data: { requestedTotalQuantity: qty },
                });
            } else {
                await tx.stockRequest.create({
                    data: {
                        channelId,
                        requestType: 'INITIAL',
                        requestedTotalQuantity: qty,
                        status: 'submitted',
                    },
                });
            }
        }

        // 4. Log
        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_updated',
                details: { name, location, staffCount: staff.length, initialQuantity: initialQuantity ? parseInt(initialQuantity) : null },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}

// ============ SUBMIT & APPROVE CHANNEL ============

export async function submitChannel(channelId: string) {
    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Channel not found');
    if (channel.status !== 'draft') throw new Error('Only draft channels can be submitted');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'submitted' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_submitted',
                details: { previousStatus: 'draft' },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}

export async function approveChannel(channelId: string) {
    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new Error('Channel not found');
    if (!['draft', 'submitted'].includes(channel.status)) {
        throw new Error('Only draft or submitted channels can be approved');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'approved' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_approved',
                details: { previousStatus: channel.status },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}

// ============ CLOSING & RETURN FLOW (EVENT only) ============

export async function closeChannelStock(
    channelId: string,
    items: { barcode: string; damaged: number; missing: number }[]
) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: { stock: true },
    });

    if (!channel) throw new Error('Channel not found');
    if (channel.type !== 'EVENT') throw new Error('Only EVENT channels can be closed');
    if (channel.status !== 'active') throw new Error('Channel must be active to close');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // Create return summary
        const returnSummary = await tx.returnSummary.create({
            data: {
                channelId,
                items: {
                    create: channel.stock.map((stockItem: any) => {
                        const closeItem = items.find(i => i.barcode === stockItem.barcode);
                        const remaining = stockItem.quantity - stockItem.soldQuantity;
                        return {
                            barcode: stockItem.barcode,
                            soldQuantity: stockItem.soldQuantity,
                            remainingQuantity: remaining - (closeItem?.damaged || 0) - (closeItem?.missing || 0),
                            damagedQuantity: closeItem?.damaged || 0,
                            missingQuantity: closeItem?.missing || 0,
                        };
                    }),
                },
            },
        });

        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'pending_return' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'close_stock_submitted',
                details: { returnSummaryId: returnSummary.id },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/pc/close');
}

export async function createReturnShipment(
    channelId: string,
    shipmentData: { provider: string; trackingNo?: string }
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'returning' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'return_shipment_created',
                details: shipmentData,
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/warehouse/return');
}

export async function confirmReturnReceived(channelId: string) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            returnSummaries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { items: true },
            },
        },
    });

    if (!channel) throw new Error('Channel not found');

    const returnSummary = channel.returnSummaries[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // Add returned stock back to warehouse
        if (returnSummary) {
            for (const item of returnSummary.items) {
                if (item.remainingQuantity > 0) {
                    await tx.warehouseStock.upsert({
                        where: { barcode: item.barcode },
                        update: { quantity: { increment: item.remainingQuantity } },
                        create: { barcode: item.barcode, quantity: item.remainingQuantity },
                    });

                    await tx.stockMovement.create({
                        data: {
                            movementType: 'RETURN',
                            barcode: item.barcode,
                            quantity: item.remainingQuantity,
                            fromLocation: channel.name,
                            toLocation: 'WAREHOUSE',
                            channelId,
                            notes: 'Stock returned from closed event',
                        },
                    });
                }
            }

            await tx.returnSummary.update({
                where: { id: returnSummary.id },
                data: { confirmedAt: new Date(), confirmedBy: 'system' },
            });
        }

        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'returned' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'return_confirmed',
                details: { returnSummaryId: returnSummary?.id },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/warehouse/return');
}

export async function closeChannelManual(channelId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        await tx.salesChannel.update({
            where: { id: channelId },
            data: { status: 'completed' },
        });

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_closed',
                details: { closedManually: true },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}

// ============ EXPENSES ============

export async function addChannelExpense(
    channelId: string,
    data: { category: string; amount: number; description: string }
) {
    await db.channelExpense.create({
        data: {
            channelId,
            category: data.category,
            amount: data.amount,
            description: data.description,
            status: 'approved',
        },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'expense_added',
            details: data,
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
}

export async function removeChannelExpense(expenseId: string, channelId: string) {
    await db.channelExpense.delete({
        where: { id: expenseId },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'expense_removed',
            details: { expenseId },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
}

// ============ COMPENSATION SUMMARY ============

export async function getChannelCompensationSummary(channelId: string) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            staff: {
                include: { staff: true },
            },
            attendance: true,
            sales: {
                where: { status: 'active' },
                include: { items: true },
            },
        },
    });

    if (!channel) throw new Error('Channel not found');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalChannelSales = channel.sales.reduce(
        (sum: number, sale: { totalAmount: any }) => sum + Number(sale.totalAmount), 0
    );

    const staffSummary = channel.staff.map((cs: any) => {
        const staffAttendance = channel.attendance.filter((a: any) => a.staffId === cs.staffId);
        const daysWorked = staffAttendance.length;
        const dailyRate = Number(cs.staff.dailyRate || 0);
        const totalWage = daysWorked * dailyRate;

        // Commission based on staff's commission settings
        const commissionRate = Number(cs.commissionOverride || cs.staff.commissionAmount || 0);
        const totalCommission = commissionRate * daysWorked;

        return {
            staffId: cs.staffId,
            name: cs.staff.name,
            role: cs.role || 'PC',
            isMain: cs.isMain,
            daysWorked,
            dailyRate,
            totalWage,
            commissionRate,
            totalCommission,
            totalPay: totalWage + totalCommission,
        };
    });

    return {
        channelId,
        channelName: channel.name,
        totalChannelSales,
        staffSummary,
        totalStaffCost: staffSummary.reduce((sum: number, s: { totalPay: number }) => sum + s.totalPay, 0),
    };
}
