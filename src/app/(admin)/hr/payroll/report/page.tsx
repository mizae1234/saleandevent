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

    // Grouped expense sum lookup Map: key -> `${channelId}_${createdBy}`
    const expenseAggs = await db.channelExpense.groupBy({
        by: ['channelId', 'createdBy'],
        where: {
            status: { in: ['approved', 'pending'] },
            createdBy: { not: null },
        },
        _sum: { amount: true },
    });
    const expenseMap = new Map<string, number>();
    expenseAggs.forEach(agg => {
        expenseMap.set(`${agg.channelId}_${agg.createdBy}`, Number(agg._sum.amount || 0));
    });

    // Parse and map records
    const rows = channelStaffs.map(cs => {
        const attendanceCount = attendanceMap.get(`${cs.channelId}_${cs.staffId}`) || 0;
        const daysWorked = cs.daysWorkedOverride !== null && cs.daysWorkedOverride !== undefined
            ? cs.daysWorkedOverride
            : attendanceCount;

        const dailyRate = cs.dailyRateOverride !== null && cs.dailyRateOverride !== undefined
            ? Number(cs.dailyRateOverride)
            : Number(cs.staff.dailyRate || 0);

        const totalWage = daysWorked * dailyRate;

        const commissionRate = cs.commissionOverride !== null && cs.commissionOverride !== undefined
            ? Number(cs.commissionOverride)
            : Number(cs.staff.commissionAmount || 0);

        const expenseAmount = expenseMap.get(`${cs.channelId}_${cs.staffId}`) || 0;

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
        new Map(rows.map(r => [r.channelId, { id: r.channelId, name: r.channelName, code: r.channelCode }])).values()
    );

    return (
        <PayrollReportClient
            rows={rows}
            channels={channels}
            salaryAccess={salaryAccess}
        />
    );
}
