'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateStaffDailyRate(channelStaffId: string, dailyRate: number | null) {
    await db.channelStaff.update({
        where: { id: channelStaffId },
        data: { dailyRateOverride: dailyRate },
    });
    const cs = await db.channelStaff.findUnique({ 
        where: { id: channelStaffId }, 
        select: { channelId: true, staffId: true } 
    });
    if (cs) {
        revalidatePath(`/hr/payroll/${cs.channelId}`);
        revalidatePath(`/hr/payroll/${cs.channelId}/staff/${cs.staffId}`);
        revalidatePath('/hr/payroll');
        revalidatePath('/hr/payroll/report');
        revalidatePath(`/channel/${cs.channelId}/payroll`);
    }
}

export async function toggleWagePaid(channelStaffId: string, isWagePaid: boolean) {
    await db.channelStaff.update({
        where: { id: channelStaffId },
        data: {
            isWagePaid,
            wagePaidAt: isWagePaid ? new Date() : null,
        },
    });
    const cs = await db.channelStaff.findUnique({ 
        where: { id: channelStaffId }, 
        select: { channelId: true, staffId: true } 
    });
    if (cs) {
        revalidatePath(`/hr/payroll/${cs.channelId}`);
        revalidatePath(`/hr/payroll/${cs.channelId}/staff/${cs.staffId}`);
        revalidatePath('/hr/payroll');
        revalidatePath('/hr/payroll/report');
        revalidatePath(`/channel/${cs.channelId}/payroll`);
    }
}

export async function toggleCommissionPaid(channelStaffId: string, isCommissionPaid: boolean) {
    await db.channelStaff.update({
        where: { id: channelStaffId },
        data: {
            isCommissionPaid,
            commissionPaidAt: isCommissionPaid ? new Date() : null,
        },
    });
    const cs = await db.channelStaff.findUnique({ 
        where: { id: channelStaffId }, 
        select: { channelId: true, staffId: true } 
    });
    if (cs) {
        revalidatePath(`/hr/payroll/${cs.channelId}`);
        revalidatePath(`/hr/payroll/${cs.channelId}/staff/${cs.staffId}`);
        revalidatePath('/hr/payroll');
        revalidatePath('/hr/payroll/report');
        revalidatePath(`/channel/${cs.channelId}/payroll`);
    }
}

export async function markAllWagePaid(channelId: string, isWagePaid: boolean) {
    await db.channelStaff.updateMany({
        where: { channelId },
        data: { isWagePaid, wagePaidAt: isWagePaid ? new Date() : null },
    });
    revalidatePath(`/hr/payroll/${channelId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${channelId}/payroll`);
}

export async function markAllCommissionPaid(channelId: string, isCommissionPaid: boolean) {
    await db.channelStaff.updateMany({
        where: { channelId },
        data: { isCommissionPaid, commissionPaidAt: isCommissionPaid ? new Date() : null },
    });
    revalidatePath(`/hr/payroll/${channelId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${channelId}/payroll`);
}

export async function submitPayroll(channelId: string, staffId: string) {
    await db.channelStaff.updateMany({
        where: { channelId, staffId },
        data: {
            isSubmitted: true,
            submittedAt: new Date(),
        },
    });
    revalidatePath(`/hr/payroll/${channelId}`);
    revalidatePath(`/hr/payroll/${channelId}/staff/${staffId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${channelId}/payroll`);
}
