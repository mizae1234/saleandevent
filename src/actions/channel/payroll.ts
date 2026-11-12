'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function revalidatePayrollPaths(channelId: string, staffId?: string) {
    revalidatePath(`/hr/payroll/${channelId}`);
    if (staffId) {
        revalidatePath(`/hr/payroll/${channelId}/staff/${staffId}`);
    }
    revalidatePath('/hr/payroll');
    revalidatePath('/hr/payroll/report');
    revalidatePath(`/channel/${channelId}/payroll`);
}

export async function updateStaffDailyRate(
    channelStaffId: string,
    dailyRate: number | null,
    periodMonth?: string | null
) {
    const cs = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true },
    });
    if (!cs) return;

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
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
                dailyRateOverride: dailyRate,
            },
            update: {
                dailyRateOverride: dailyRate,
            },
        });
    } else {
        await db.channelStaff.update({
            where: { id: channelStaffId },
            data: { dailyRateOverride: dailyRate },
        });
    }

    revalidatePayrollPaths(cs.channelId, cs.staffId);
}

export async function toggleWagePaid(
    channelStaffId: string,
    isWagePaid: boolean,
    periodMonth?: string | null
) {
    const cs = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true },
    });
    if (!cs) return;

    const now = isWagePaid ? new Date() : null;

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
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
                isWagePaid,
                wagePaidAt: now,
            },
            update: {
                isWagePaid,
                wagePaidAt: now,
            },
        });
    } else {
        await db.channelStaff.update({
            where: { id: channelStaffId },
            data: {
                isWagePaid,
                wagePaidAt: now,
            },
        });
    }

    revalidatePayrollPaths(cs.channelId, cs.staffId);
}

export async function toggleCommissionPaid(
    channelStaffId: string,
    isCommissionPaid: boolean,
    periodMonth?: string | null
) {
    const cs = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true },
    });
    if (!cs) return;

    const now = isCommissionPaid ? new Date() : null;

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
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
                isCommissionPaid,
                commissionPaidAt: now,
            },
            update: {
                isCommissionPaid,
                commissionPaidAt: now,
            },
        });
    } else {
        await db.channelStaff.update({
            where: { id: channelStaffId },
            data: {
                isCommissionPaid,
                commissionPaidAt: now,
            },
        });
    }

    revalidatePayrollPaths(cs.channelId, cs.staffId);
}

export async function markAllWagePaid(
    channelId: string,
    isWagePaid: boolean,
    periodMonth?: string | null
) {
    const now = isWagePaid ? new Date() : null;

    if (periodMonth) {
        const staffs = await db.channelStaff.findMany({
            where: { channelId },
            select: { id: true, channelId: true, staffId: true },
        });
        await db.$transaction(
            staffs.map((cs) =>
                db.channelStaffPeriod.upsert({
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
                        isWagePaid,
                        wagePaidAt: now,
                    },
                    update: {
                        isWagePaid,
                        wagePaidAt: now,
                    },
                })
            )
        );
    } else {
        await db.channelStaff.updateMany({
            where: { channelId },
            data: { isWagePaid, wagePaidAt: now },
        });
    }

    revalidatePayrollPaths(channelId);
}

export async function markAllCommissionPaid(
    channelId: string,
    isCommissionPaid: boolean,
    periodMonth?: string | null
) {
    const now = isCommissionPaid ? new Date() : null;

    if (periodMonth) {
        const staffs = await db.channelStaff.findMany({
            where: { channelId },
            select: { id: true, channelId: true, staffId: true },
        });
        await db.$transaction(
            staffs.map((cs) =>
                db.channelStaffPeriod.upsert({
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
                        isCommissionPaid,
                        commissionPaidAt: now,
                    },
                    update: {
                        isCommissionPaid,
                        commissionPaidAt: now,
                    },
                })
            )
        );
    } else {
        await db.channelStaff.updateMany({
            where: { channelId },
            data: { isCommissionPaid, commissionPaidAt: now },
        });
    }

    revalidatePayrollPaths(channelId);
}

export async function submitPayroll(
    channelId: string,
    staffId: string,
    periodMonth?: string | null
) {
    if (periodMonth) {
        const cs = await db.channelStaff.findFirst({
            where: { channelId, staffId },
            select: { id: true },
        });
        if (!cs) return;

        await db.channelStaffPeriod.upsert({
            where: {
                channelStaffId_periodMonth: {
                    channelStaffId: cs.id,
                    periodMonth,
                },
            },
            create: {
                channelStaffId: cs.id,
                channelId,
                staffId,
                periodMonth,
                isSubmitted: true,
                submittedAt: new Date(),
            },
            update: {
                isSubmitted: true,
                submittedAt: new Date(),
            },
        });
    } else {
        await db.channelStaff.updateMany({
            where: { channelId, staffId },
            data: {
                isSubmitted: true,
                submittedAt: new Date(),
            },
        });
    }

    revalidatePayrollPaths(channelId, staffId);
}

export async function unlockPayrollSubmission(
    channelStaffId: string,
    periodMonth?: string | null
) {
    const cs = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true },
    });
    if (!cs) return;

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
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
                isSubmitted: false,
                submittedAt: null,
            },
            update: {
                isSubmitted: false,
                submittedAt: null,
            },
        });
    } else {
        await db.channelStaff.update({
            where: { id: channelStaffId },
            data: {
                isSubmitted: false,
                submittedAt: null,
            },
        });
    }

    revalidatePayrollPaths(cs.channelId, cs.staffId);
}

/**
 * Toggle WHT issuance for a specific channel staff.
 * When toggling ON, auto-generate a running doc number if none exists.
 */
export async function toggleWhtIssued(
    channelStaffId: string,
    issued: boolean,
    periodMonth?: string | null
) {
    const current = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true, whtDocNo: true },
    });
    if (!current) return;

    if (periodMonth) {
        const existingPeriod = await db.channelStaffPeriod.findUnique({
            where: {
                channelStaffId_periodMonth: {
                    channelStaffId: current.id,
                    periodMonth,
                },
            },
            select: { whtDocNo: true },
        });

        const data: { whtIssued: boolean; whtDocNo?: string } = { whtIssued: issued };
        if (issued && !existingPeriod?.whtDocNo) {
            data.whtDocNo = await generateWhtDocNo();
        }

        await db.channelStaffPeriod.upsert({
            where: {
                channelStaffId_periodMonth: {
                    channelStaffId: current.id,
                    periodMonth,
                },
            },
            create: {
                channelStaffId: current.id,
                channelId: current.channelId,
                staffId: current.staffId,
                periodMonth,
                ...data,
            },
            update: data,
        });
    } else {
        const data: { whtIssued: boolean; whtDocNo?: string } = { whtIssued: issued };
        if (issued && !current.whtDocNo) {
            data.whtDocNo = await generateWhtDocNo();
        }

        await db.channelStaff.update({
            where: { id: channelStaffId },
            data,
        });
    }

    revalidatePayrollPaths(current.channelId, current.staffId);
}

/**
 * Update WHT document number and/or paid date
 */
export async function updateWhtDetails(
    channelStaffId: string,
    details: { docNo?: string; paidDate?: string | null },
    periodMonth?: string | null
) {
    const current = await db.channelStaff.findUnique({
        where: { id: channelStaffId },
        select: { id: true, channelId: true, staffId: true },
    });
    if (!current) return;

    const data: { whtDocNo?: string; whtPaidDate?: Date | null } = {};
    if (details.docNo !== undefined) {
        data.whtDocNo = details.docNo;
    }
    if (details.paidDate !== undefined) {
        data.whtPaidDate = details.paidDate ? new Date(details.paidDate) : null;
    }

    if (periodMonth) {
        await db.channelStaffPeriod.upsert({
            where: {
                channelStaffId_periodMonth: {
                    channelStaffId: current.id,
                    periodMonth,
                },
            },
            create: {
                channelStaffId: current.id,
                channelId: current.channelId,
                staffId: current.staffId,
                periodMonth,
                ...data,
            },
            update: data,
        });
    } else {
        await db.channelStaff.update({
            where: { id: channelStaffId },
            data,
        });
    }

    revalidatePayrollPaths(current.channelId, current.staffId);
}

/**
 * Generate next WHT document number.
 * Format: WHT-YYYY-MM-NNNN (e.g. WHT-2026-09-0001)
 * Uses MAX existing doc number across both channel_staff and channel_staff_periods.
 */
async function generateWhtDocNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `WHT-${year}-${month}-`;

    const [existingEvent, existingPeriod] = await Promise.all([
        db.channelStaff.findMany({
            where: { whtDocNo: { startsWith: prefix } },
            select: { whtDocNo: true },
            orderBy: { whtDocNo: 'desc' },
            take: 1,
        }),
        db.channelStaffPeriod.findMany({
            where: { whtDocNo: { startsWith: prefix } },
            select: { whtDocNo: true },
            orderBy: { whtDocNo: 'desc' },
            take: 1,
        }),
    ]);

    let maxSeq = 0;
    for (const item of [...existingEvent, ...existingPeriod]) {
        if (item.whtDocNo) {
            const lastNum = item.whtDocNo.replace(prefix, '');
            const parsed = parseInt(lastNum, 10);
            if (!isNaN(parsed) && parsed > maxSeq) {
                maxSeq = parsed;
            }
        }
    }

    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}
