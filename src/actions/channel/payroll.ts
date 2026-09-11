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

/**
 * Toggle WHT issuance for a specific channel staff.
 * When toggling ON, auto-generate a running doc number if none exists.
 */
export async function toggleWhtIssued(channelStaffId: string, issued: boolean) {
    const current = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { channelId: true, staffId: true, whtDocNo: true },
    });
    if (!current) return;

    const data: { whtIssued: boolean; whtDocNo?: string } = { whtIssued: issued };

    // Auto-generate doc number when toggling ON and no doc number exists
    if (issued && !current.whtDocNo) {
        data.whtDocNo = await generateWhtDocNo();
    }

    await db.channelStaff.update({
        where: { id: channelStaffId },
        data,
    });

    revalidatePath(`/hr/payroll/${current.channelId}`);
    revalidatePath(`/hr/payroll/${current.channelId}/staff/${current.staffId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${current.channelId}/payroll`);
}

/**
 * Update WHT document number and/or paid date
 */
export async function updateWhtDetails(
    channelStaffId: string, 
    details: { docNo?: string; paidDate?: string | null }
) {
    const current = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { channelId: true, staffId: true },
    });
    if (!current) return;

    const data: { whtDocNo?: string; whtPaidDate?: Date | null } = {};
    if (details.docNo !== undefined) {
        data.whtDocNo = details.docNo;
    }
    if (details.paidDate !== undefined) {
        data.whtPaidDate = details.paidDate ? new Date(details.paidDate) : null;
    }

    await db.channelStaff.update({
        where: { id: channelStaffId },
        data,
    });

    revalidatePath(`/hr/payroll/${current.channelId}`);
    revalidatePath(`/hr/payroll/${current.channelId}/staff/${current.staffId}`);
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${current.channelId}/payroll`);
}

/**
 * Generate next WHT document number.
 * Format: WHT-YYYY-MM-NNNN (e.g. WHT-2026-09-0001)
 * Uses MAX existing doc number for the current month to determine next sequence.
 */
async function generateWhtDocNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `WHT-${year}-${month}-`;

    // Find max existing doc number with this prefix
    const existing = await db.channelStaff.findMany({
        where: {
            whtDocNo: { startsWith: prefix },
        },
        select: { whtDocNo: true },
        orderBy: { whtDocNo: 'desc' },
        take: 1,
    });

    let nextSeq = 1;
    if (existing.length > 0 && existing[0].whtDocNo) {
        const lastNum = existing[0].whtDocNo.replace(prefix, '');
        const parsed = parseInt(lastNum, 10);
        if (!isNaN(parsed)) {
            nextSeq = parsed + 1;
        }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}
