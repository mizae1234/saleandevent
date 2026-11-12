import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getChannelCompensationSummary } from "@/actions/channel";
import PayrollDetailClient from "./PayrollDetailClient";
import { getSession } from "@/lib/auth";
import { calculatePayrollTax } from "@/lib/expense-tax";
import {
    getCurrentPeriodMonth,
    isValidPeriodMonth,
    getPeriodMonthDateRange,
    getPeriodMonthOptions,
} from "@/lib/payroll-period";

export default async function PayrollDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const { id: channelId } = await params;
    const resolvedSearchParams = await searchParams;
    const session = await getSession();
    const salaryAccess = session?.salaryAccess || null;

    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
        select: {
            id: true,
            type: true,
            name: true,
            code: true,
            location: true,
            startDate: true,
            endDate: true,
            status: true,
            staff: {
                include: {
                    staff: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            bankAccountNo: true,
                            bankName: true,
                            phone: true,
                            paymentType: true,
                        },
                    },
                    periods: true,
                },
            },
        },
    });

    if (!channel) notFound();

    const isBranch = channel.type === 'BRANCH';
    const currentMonth = getCurrentPeriodMonth();
    const periodMonth = isBranch
        ? (isValidPeriodMonth(resolvedSearchParams.period) ? resolvedSearchParams.period : currentMonth)
        : null;

    const [compensation, expenseDetails, categories, periodSalesAgg] = await Promise.all([
        getChannelCompensationSummary(channelId, periodMonth).catch(() => null),
        db.channelExpense.findMany({
            where: {
                channelId,
                status: { in: ['approved', 'pending'] },
                createdBy: { not: null },
                ...(isBranch && periodMonth
                    ? {
                        OR: [
                            { periodMonth },
                            ...(periodMonth === currentMonth ? [{ periodMonth: null }] : []),
                        ],
                    }
                    : {}),
            },
            select: {
                createdBy: true,
                category: true,
                amount: true,
                description: true,
            },
        }),
        db.expenseCategory.findMany({
            select: { name: true, whtType: true },
        }),
        isBranch && periodMonth
            ? (() => {
                const { start, end } = getPeriodMonthDateRange(periodMonth);
                return db.sale.aggregate({
                    where: {
                        channelId,
                        status: 'active',
                        soldAt: { gte: start, lte: end },
                    },
                    _sum: { totalAmount: true },
                });
            })()
            : Promise.resolve(null),
    ]);

    const categoryWhtMap = new Map(categories.map(c => [c.name, c.whtType]));

    // Build expense map: staffId -> list of expenses
    const expenseDetailsMap = new Map<string, { category: string; amount: number; description: string | null; whtType: string }[]>();
    expenseDetails.forEach(e => {
        const staffId = e.createdBy!;
        if (!expenseDetailsMap.has(staffId)) {
            expenseDetailsMap.set(staffId, []);
        }
        expenseDetailsMap.get(staffId)!.push({
            category: e.category,
            amount: Number(e.amount),
            description: e.description,
            whtType: categoryWhtMap.get(e.category) || 'none',
        });
    });

    // Merge staff bank data with compensation data (using period state when BRANCH)
    const staffMap = new Map(
        channel.staff.map(cs => {
            const periodRec = isBranch && periodMonth
                ? cs.periods.find(p => p.periodMonth === periodMonth) || null
                : null;
            const stateSource = isBranch ? periodRec : cs;

            return [
                cs.staffId,
                {
                    ...cs.staff,
                    channelStaffId: cs.id,
                    isWagePaid: stateSource?.isWagePaid || false,
                    wagePaidAt: stateSource?.wagePaidAt || null,
                    isCommissionPaid: stateSource?.isCommissionPaid || false,
                    commissionPaidAt: stateSource?.commissionPaidAt || null,
                    isSubmitted: stateSource?.isSubmitted || false,
                    submittedAt: stateSource?.submittedAt || null,
                    whtIssued: stateSource?.whtIssued || false,
                    whtDocNo: stateSource?.whtDocNo || null,
                    whtPaidDate: stateSource?.whtPaidDate || null,
                },
            ];
        })
    );

    const rows = (compensation?.staffSummary || []).map(s => {
        const staff = staffMap.get(s.staffId);
        const staffExpenses = expenseDetailsMap.get(s.staffId) || [];
        const expenseAmount = staffExpenses.reduce((sum, e) => sum + e.amount, 0);

        const travelExpense = staffExpenses.filter(e => e.category === 'ค่าเดินทาง').reduce((sum, e) => sum + e.amount, 0);
        const setupExpense = staffExpenses.filter(e => e.category === 'ค่าลงงาน' || e.category === 'ค่าลงของ').reduce((sum, e) => sum + e.amount, 0);
        const teardownExpense = staffExpenses.filter(e => e.category === 'ค่าเก็บงาน' || e.category === 'ค่าเก็บของ').reduce((sum, e) => sum + e.amount, 0);
        const targetIncentive = staffExpenses.filter(e => e.category === 'ค่าเป้า').reduce((sum, e) => sum + e.amount, 0);
        const otherExpense = staffExpenses.filter(e => !['ค่าเดินทาง', 'ค่าลงงาน', 'ค่าเก็บงาน', 'ค่าลงของ', 'ค่าเก็บของ', 'ค่าเป้า'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

        const taxResult = calculatePayrollTax({
            daysWorked: s.daysWorked,
            dailyRate: s.dailyRate,
            commission: s.totalCommission,
            expenses: staffExpenses,
        });

        const withholdingTax = taxResult.totalWithholdingTax;

        const expenseDetailsStr = staffExpenses.map(e => {
            const descSuffix = e.description && e.description !== e.category ? ` (${e.description})` : '';
            return `${e.category}${descSuffix} ฿${e.amount.toLocaleString()}`;
        }).join(' | ');

        return {
            ...s,
            staffCode: staff?.code || '-',
            bankName: staff?.bankName || '-',
            bankAccountNo: staff?.bankAccountNo || '-',
            phone: staff?.phone || '-',
            paymentType: staff?.paymentType || 'daily',
            isWagePaid: staff?.isWagePaid || false,
            wagePaidAt: staff?.wagePaidAt?.toISOString() || null,
            isCommissionPaid: staff?.isCommissionPaid || false,
            commissionPaidAt: staff?.commissionPaidAt?.toISOString() || null,
            isSubmitted: staff?.isSubmitted || false,
            submittedAt: staff?.submittedAt?.toISOString() || null,
            expenseAmount,
            travelExpense,
            setupExpense,
            teardownExpense,
            targetIncentive,
            otherExpense,
            withholdingTax,
            expenseDetailsStr: expenseDetailsStr || '-',
            whtIssued: staff?.whtIssued || false,
            whtDocNo: staff?.whtDocNo || '',
            whtPaidDate: staff?.whtPaidDate ? staff.whtPaidDate.toISOString().slice(0, 10) : '',
        };
    });

    const resolvedChannelSales = isBranch && periodSalesAgg
        ? Number(periodSalesAgg._sum.totalAmount || 0)
        : (compensation?.totalChannelSales || 0);

    return (
        <PayrollDetailClient
            channel={{
                id: channel.id,
                type: channel.type || 'EVENT',
                name: channel.name,
                code: channel.code,
                location: channel.location || '',
                startDate: channel.startDate?.toISOString() || null,
                endDate: channel.endDate?.toISOString() || null,
            }}
            periodMonth={periodMonth}
            periodOptions={isBranch ? getPeriodMonthOptions(11, 2) : []}
            rows={rows}
            totalChannelSales={resolvedChannelSales}
            salaryAccess={salaryAccess}
        />
    );
}
