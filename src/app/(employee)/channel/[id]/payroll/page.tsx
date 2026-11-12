import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { PayrollClient } from "./PayrollClient";
import {
    getCurrentPeriodMonth,
    isValidPeriodMonth,
    getPeriodMonthDateRange,
    getPeriodMonthOptions,
} from "@/lib/payroll-period";

export default async function EmployeePayrollPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const { id: channelId } = await params;
    const resolvedSearchParams = await searchParams;
    const session = await getSession();
    if (!session) redirect('/login');

    // Validate channel access
    const isAdmin = ['ADMIN', 'MANAGER'].includes(session.role);
    if (!isAdmin) {
        const hasAccess = await db.channelStaff.findFirst({
            where: { channelId, staffId: session.staffId }
        });
        if (!hasAccess) notFound();
    }

    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
    });
    if (!channel) notFound();

    const isBranch = channel.type === 'BRANCH';
    const currentMonth = getCurrentPeriodMonth();
    const periodMonth = isBranch
        ? (isValidPeriodMonth(resolvedSearchParams.period) ? resolvedSearchParams.period : currentMonth)
        : null;

    // Get staff info & assignment
    const staff = await db.staff.findUnique({
        where: { id: session.staffId },
        select: { dailyRate: true, commissionAmount: true, paymentType: true },
    });

    const assignment = await db.channelStaff.findFirst({
        where: { channelId, staffId: session.staffId },
        include: {
            attachments: {
                orderBy: { createdAt: 'desc' },
            },
            periods: {
                orderBy: { periodMonth: 'desc' },
            },
        },
    });

    const periodRecord = isBranch && periodMonth && assignment
        ? assignment.periods.find(p => p.periodMonth === periodMonth) || null
        : null;

    // Count attendance (filtered by month if BRANCH)
    let attendanceWhere: { channelId: string; staffId: string; date?: { gte: Date; lte: Date } } = {
        channelId,
        staffId: session.staffId,
    };
    if (isBranch && periodMonth) {
        const { start, end } = getPeriodMonthDateRange(periodMonth);
        attendanceWhere = {
            ...attendanceWhere,
            date: { gte: start, lte: end },
        };
    }
    const attendanceDays = await db.attendance.count({
        where: attendanceWhere,
    });

    // Get expenses for this channel submitted by this staff
    const [expenses, expenseCategories] = await Promise.all([
        db.channelExpense.findMany({
            where: {
                channelId,
                createdBy: session.staffId,
                ...(isBranch && periodMonth
                    ? {
                        OR: [
                            { periodMonth },
                            ...(periodMonth === currentMonth ? [{ periodMonth: null }] : []),
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        }),
        db.expenseCategory.findMany({
            where: { isActive: true, type: 'emp' },
            orderBy: { sortOrder: 'asc' },
            select: { name: true },
        }),
    ]);

    const paymentType = staff?.paymentType || 'daily';
    const isMonthly = paymentType === 'monthly';
    const stateSource = isBranch ? periodRecord : assignment;

    // Calculate wage/salary summary — use override if set, otherwise master rate
    const dailyRate = stateSource?.dailyRateOverride != null
        ? Number(stateSource.dailyRateOverride)
        : Number(staff?.dailyRate || 0);
    const daysWorked = isMonthly
        ? (stateSource?.daysWorkedOverride ?? 1)
        : (stateSource?.daysWorkedOverride ?? attendanceDays);
    const commission = Number(stateSource?.commissionOverride ?? staff?.commissionAmount ?? 0);
    const baseWage = isMonthly ? dailyRate : (dailyRate * daysWorked);
    const wageSummary = baseWage + commission;

    const expenseData = expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
    }));

    const filteredAttachments = (assignment?.attachments || []).filter(a => {
        if (!isBranch || !periodMonth) return true;
        if (a.periodMonth === periodMonth) return true;
        if (periodMonth === currentMonth && a.periodMonth === null) return true;
        return false;
    });

    const periodOptions = isBranch ? getPeriodMonthOptions(11, 2) : [];
    const periodHistoryMap: Record<string, { isSubmitted: boolean; isWagePaid: boolean; isCommissionPaid: boolean }> = {};
    if (isBranch && assignment?.periods) {
        for (const p of assignment.periods) {
            periodHistoryMap[p.periodMonth] = {
                isSubmitted: p.isSubmitted,
                isWagePaid: p.isWagePaid,
                isCommissionPaid: p.isCommissionPaid,
            };
        }
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}`}
                    className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        {isBranch ? 'เบิกเงินเดือน / ค่าคอม / ค่าใช้จ่ายรายเดือน' : 'เงินเดือน / ค่าใช้จ่าย'}
                    </h1>
                    <p className="text-xs text-slate-400">
                        {channel.name} — {channel.code}
                        {isBranch && ' • รอบจ่ายทุกวันที่ 30'}
                    </p>
                </div>
            </div>

            <PayrollClient
                channelId={channelId}
                channelType={channel.type}
                periodMonth={periodMonth}
                periodOptions={periodOptions}
                periodHistoryMap={periodHistoryMap}
                staffId={session.staffId}
                paymentType={paymentType}
                categories={expenseCategories.map(c => c.name)}
                startDate={channel.startDate?.toISOString() || null}
                endDate={channel.endDate?.toISOString() || null}
                expenses={expenseData}
                wage={{
                    dailyRate,
                    daysWorked,
                    commission,
                    attendanceDays,
                    wageSummary,
                }}
                isSubmitted={stateSource?.isSubmitted || false}
                submittedAt={stateSource?.submittedAt?.toISOString() || null}
                isWagePaid={stateSource?.isWagePaid || false}
                wagePaidAt={stateSource?.wagePaidAt?.toISOString() || null}
                isCommissionPaid={stateSource?.isCommissionPaid || false}
                commissionPaidAt={stateSource?.commissionPaidAt?.toISOString() || null}
                attachments={filteredAttachments.map(a => ({
                    id: a.id,
                    fileName: a.fileName,
                    fileUrl: a.fileUrl,
                    fileType: a.fileType,
                    fileSize: a.fileSize,
                }))}
            />
        </div>
    );
}
