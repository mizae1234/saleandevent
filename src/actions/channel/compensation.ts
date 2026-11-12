'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getChannelCompensationSummary(channelId: string, periodMonth?: string | null) {
    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            staff: {
                include: {
                    staff: true,
                    ...(periodMonth ? { periods: { where: { periodMonth } } } : {}),
                },
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffSummary = channel.staff.map((cs: any) => {
        const periodRec = periodMonth && cs.periods ? cs.periods[0] : null;
        const stateSource = periodMonth ? periodRec : cs;

        const staffAttendance = channel.attendance.filter((a: any) => {
            if (a.staffId !== cs.staffId) return false;
            if (periodMonth && a.date) {
                const ym = new Date(a.date).toISOString().slice(0, 7);
                return ym === periodMonth;
            }
            return true;
        });
        const attendanceDays = staffAttendance.length;
        const isMonthly = cs.staff.paymentType === 'monthly';

        const daysWorked = isMonthly
            ? ((stateSource?.daysWorkedOverride != null) ? stateSource.daysWorkedOverride : 1)
            : ((stateSource?.isSubmitted && stateSource?.daysWorkedOverride != null)
                ? stateSource.daysWorkedOverride
                : (stateSource?.daysWorkedOverride ?? attendanceDays));

        const dailyRate = (stateSource?.dailyRateOverride != null)
            ? Number(stateSource.dailyRateOverride)
            : Number(cs.staff.dailyRate || 0);

        const totalWage = isMonthly ? dailyRate * daysWorked : daysWorked * dailyRate;

        // Commission: flat amount (not multiplied by days)
        const commissionRate = (stateSource?.commissionOverride != null)
            ? Number(stateSource.commissionOverride)
            : Number(cs.staff.commissionAmount ?? 0);
        const totalCommission = commissionRate;

        return {
            channelStaffId: cs.id,
            staffId: cs.staffId,
            name: cs.staff.name,
            role: cs.role || 'PC',
            isMain: cs.isMain,
            paymentType: cs.staff.paymentType || 'daily',
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
    items: { channelStaffId: string; daysWorked: number; commissionRate: number }[],
    periodMonth?: string | null
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        for (const item of items) {
            if (periodMonth) {
                const cs = await tx.channelStaff.findUnique({
                    where: { id: item.channelStaffId },
                    select: { id: true, channelId: true, staffId: true },
                });
                if (cs) {
                    await tx.channelStaffPeriod.upsert({
                        where: {
                            channelStaffId_periodMonth: {
                                channelStaffId: cs.id,
                                periodMonth,
                            },
                        },
                        create: {
                            channelStaffId: cs.id,
                            channelId: cs.channelId,
                            staffId: cs.staffId,
                            periodMonth,
                            daysWorkedOverride: item.daysWorked,
                            commissionOverride: item.commissionRate,
                            isSubmitted: true,
                            submittedAt: new Date(),
                        },
                        update: {
                            daysWorkedOverride: item.daysWorked,
                            commissionOverride: item.commissionRate,
                            isSubmitted: true,
                            submittedAt: new Date(),
                        },
                    });
                }
            } else {
                await tx.channelStaff.update({
                    where: { id: item.channelStaffId },
                    data: {
                        daysWorkedOverride: item.daysWorked,
                        commissionOverride: item.commissionRate,
                        isSubmitted: true,
                        submittedAt: new Date(),
                    },
                });
            }
        }

        await tx.channelLog.create({
            data: {
                channelId,
                action: 'compensation_updated',
                details: { staffCount: items.length, periodMonth: periodMonth || null },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath(`/hr/payroll/${channelId}`);
    revalidatePath(`/hr/payroll/${channelId}/staff/${items[0]?.channelStaffId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${channelId}/payroll`);
}

export async function updateEmployeeCompensation(
    channelId: string,
    staffId: string,
    data: { daysWorked: number; commission: number; dailyRate?: number },
    periodMonth?: string | null
) {
    if (data.daysWorked < 0) throw new Error('Days worked cannot be negative');
    if (data.commission < 0) throw new Error('Commission cannot be negative');
    if (data.dailyRate != null && data.dailyRate < 0) throw new Error('Daily rate cannot be negative');

    const assignment = await db.channelStaff.findFirst({
        where: { channelId, staffId },
    });
    if (!assignment) throw new Error('Staff not assigned to this channel');

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
            where: {
                channelStaffId_periodMonth: {
                    channelStaffId: assignment.id,
                    periodMonth,
                },
            },
            create: {
                channelStaffId: assignment.id,
                channelId,
                staffId,
                periodMonth,
                daysWorkedOverride: data.daysWorked,
                commissionOverride: data.commission,
                ...(data.dailyRate != null ? { dailyRateOverride: data.dailyRate } : {}),
            },
            update: {
                daysWorkedOverride: data.daysWorked,
                commissionOverride: data.commission,
                ...(data.dailyRate != null ? { dailyRateOverride: data.dailyRate } : {}),
            },
        });
    } else {
        await db.channelStaff.update({
            where: { id: assignment.id },
            data: {
                daysWorkedOverride: data.daysWorked,
                commissionOverride: data.commission,
                ...(data.dailyRate != null ? { dailyRateOverride: data.dailyRate } : {}),
            },
        });
    }

    await db.channelLog.create({
        data: {
            channelId,
            action: 'compensation_updated_by_staff',
            details: {
                staffId,
                daysWorked: data.daysWorked,
                commission: data.commission,
                dailyRate: data.dailyRate,
                periodMonth: periodMonth || null,
            },
            changedBy: staffId,
        },
    });

    revalidatePath(`/channel/${channelId}/payroll`);
    revalidatePath(`/hr/payroll/${channelId}`);
    revalidatePath(`/hr/payroll/${channelId}/staff/${staffId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
}
