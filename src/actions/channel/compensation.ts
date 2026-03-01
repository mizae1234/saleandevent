'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
                select: { totalAmount: true },
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
        const attendanceDays = staffAttendance.length;
        // Use override if set, otherwise use attendance count
        const daysWorked = cs.daysWorkedOverride != null ? cs.daysWorkedOverride : attendanceDays;
        const dailyRate = cs.dailyRateOverride != null ? Number(cs.dailyRateOverride) : Number(cs.staff.dailyRate || 0);
        const totalWage = daysWorked * dailyRate;

        // Commission: flat amount (not multiplied by days)
        const commissionRate = Number(cs.commissionOverride ?? cs.staff.commissionAmount ?? 0);
        const totalCommission = commissionRate;

        return {
            channelStaffId: cs.id,
            staffId: cs.staffId,
            name: cs.staff.name,
            role: cs.role || 'PC',
            isMain: cs.isMain,
            attendanceDays,
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

export async function saveStaffCompensation(
    channelId: string,
    items: { channelStaffId: string; daysWorked: number; commissionRate: number }[]
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        for (const item of items) {
            await tx.channelStaff.update({
                where: { id: item.channelStaffId },
                data: {
                    daysWorkedOverride: item.daysWorked,
                    commissionOverride: item.commissionRate,
                },
            });
        }

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'compensation_updated',
                details: { staffCount: items.length },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
}

export async function updateEmployeeCompensation(
    channelId: string,
    staffId: string,
    data: { daysWorked: number; commission: number }
) {
    if (data.daysWorked < 0) throw new Error('Days worked cannot be negative');
    if (data.commission < 0) throw new Error('Commission cannot be negative');

    const assignment = await db.channelStaff.findFirst({
        where: { channelId, staffId },
    });
    if (!assignment) throw new Error('Staff not assigned to this channel');

    await db.channelStaff.update({
        where: { id: assignment.id },
        data: {
            daysWorkedOverride: data.daysWorked,
            commissionOverride: data.commission,
        },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'compensation_updated_by_staff',
            details: { staffId, daysWorked: data.daysWorked, commission: data.commission },
            changedBy: staffId,
        },
    });

    revalidatePath(`/channel/${channelId}/payroll`);
}
