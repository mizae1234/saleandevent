import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PayrollReportClient } from "./PayrollReportClient";

export default async function PayrollReportPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const salaryAccess = session?.salaryAccess || null;

    // Fetch all staff assignments across non-draft channels
    const channelStaffs = await db.channelStaff.findMany({
        where: {
            channel: {
                status: { notIn: ['draft'] }
            }
        },
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
                    dailyRate: true,
                    commissionAmount: true,
                }
            },
            channel: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                }
            }
        },
        orderBy: [
            { channel: { startDate: 'desc' } },
            { staff: { name: 'asc' } }
        ]
    });

    // Grouped attendance count lookup Map: key -> `${channelId}_${staffId}`
    const attendanceAggs = await db.attendance.groupBy({
        by: ['channelId', 'staffId'],
        _count: true,
    });
    const attendanceMap = new Map<string, number>();
    attendanceAggs.forEach(agg => {
        attendanceMap.set(`${agg.channelId}_${agg.staffId}`, agg._count);
    });

    // Detailed expenses lookup Map: key -> list of expenses
    const expenseDetails = await db.channelExpense.findMany({
        where: {
            status: { in: ['approved', 'pending'] },
            createdBy: { not: null },
        },
        select: {
            channelId: true,
            createdBy: true,
            category: true,
            amount: true,
            description: true,
        },
    });

    const expenseMap = new Map<string, { category: string; amount: number; description: string | null }[]>();
    expenseDetails.forEach(e => {
        const key = `${e.channelId}_${e.createdBy}`;
        if (!expenseMap.has(key)) {
            expenseMap.set(key, []);
        }
        expenseMap.get(key)!.push({
            category: e.category,
            amount: Number(e.amount),
            description: e.description,
        });
    });

    // Parse and map records
    const rows = channelStaffs.map(cs => {
        const attendanceCount = attendanceMap.get(`${cs.channelId}_${cs.staffId}`) || 0;
        const daysWorked = cs.isSubmitted && cs.daysWorkedOverride !== null && cs.daysWorkedOverride !== undefined
            ? cs.daysWorkedOverride
            : attendanceCount;

        const dailyRate = cs.isSubmitted && cs.dailyRateOverride !== null && cs.dailyRateOverride !== undefined
            ? Number(cs.dailyRateOverride)
            : Number(cs.staff.dailyRate || 0);

        const totalWage = daysWorked * dailyRate;

        const commissionRate = cs.isSubmitted && cs.commissionOverride !== null && cs.commissionOverride !== undefined
            ? Number(cs.commissionOverride)
            : Number(cs.staff.commissionAmount || 0);

        const staffExpenses = expenseMap.get(`${cs.channelId}_${cs.staffId}`) || [];
        const expenseAmount = staffExpenses.reduce((sum, e) => sum + e.amount, 0);

        const travelExpense = staffExpenses.filter(e => e.category === 'ค่าเดินทาง').reduce((sum, e) => sum + e.amount, 0);
        const setupExpense = staffExpenses.filter(e => e.category === 'ค่าลงงาน').reduce((sum, e) => sum + e.amount, 0);
        const teardownExpense = staffExpenses.filter(e => e.category === 'ค่าเก็บงาน').reduce((sum, e) => sum + e.amount, 0);
        const otherExpense = staffExpenses.filter(e => !['ค่าเดินทาง', 'ค่าลงงาน', 'ค่าเก็บงาน'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

        const expenseDetailsStr = staffExpenses.map(e => {
            const descSuffix = e.description && e.description !== e.category ? ` (${e.description})` : '';
            return `${e.category}${descSuffix} ฿${e.amount.toLocaleString()}`;
        }).join(' | ');

        return {
            channelStaffId: cs.id,
            staffId: cs.staffId,
            staffCode: cs.staff.code || '-',
            name: cs.staff.name,
            role: cs.role || 'PC',
            isMain: cs.isMain,
            bankName: cs.staff.bankName || '-',
            bankAccountNo: cs.staff.bankAccountNo || '-',
            phone: cs.staff.phone || '-',
            paymentType: cs.staff.paymentType || 'daily',
            isWagePaid: cs.isWagePaid,
            wagePaidAt: cs.wagePaidAt?.toISOString() || null,
            isCommissionPaid: cs.isCommissionPaid,
            commissionPaidAt: cs.commissionPaidAt?.toISOString() || null,
            isSubmitted: cs.isSubmitted,
            submittedAt: cs.submittedAt?.toISOString() || null,
            daysWorked,
            dailyRate,
            totalWage,
            commissionRate,
            totalCommission: commissionRate,
            expenseAmount,
            travelExpense,
            setupExpense,
            teardownExpense,
            otherExpense,
            expenseDetailsStr: expenseDetailsStr || '-',
            totalPay: totalWage + commissionRate,

            // Channel Info
            channelId: cs.channelId,
            channelName: cs.channel.name,
            channelCode: cs.channel.code,
            channelStatus: cs.channel.status,
            startDate: cs.channel.startDate?.toISOString() || null,
            endDate: cs.channel.endDate?.toISOString() || null,
        };
    });

    // Extract unique channels for the filter dropdown
    const channels = Array.from(
        new Map(rows.map(r => [r.channelId, { id: r.channelId, name: r.channelName, code: r.channelCode, status: r.channelStatus }])).values()
    );

    return (
        <PayrollReportClient
            rows={rows}
            channels={channels}
            salaryAccess={salaryAccess}
        />
    );
}
