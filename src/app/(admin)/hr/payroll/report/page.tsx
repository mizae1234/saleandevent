import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PayrollReportClient } from "./PayrollReportClient";
import { getCurrentPeriodMonth, formatPeriodMonthThai } from "@/lib/payroll-period";

export default async function PayrollReportPage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const salaryAccess = session?.salaryAccess || null;
    const currentMonth = getCurrentPeriodMonth();

    // Fetch all staff assignments across non-draft channels (including periods for BRANCH)
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
                    type: true,
                    name: true,
                    code: true,
                    location: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                }
            },
            periods: {
                orderBy: { periodMonth: 'desc' },
            },
        },
        orderBy: [
            { channel: { startDate: 'desc' } },
            { staff: { name: 'asc' } }
        ]
    });

    // Attendance records
    const allAttendance = await db.attendance.findMany({
        select: {
            channelId: true,
            staffId: true,
            date: true,
        },
    });
    const attendanceMap = new Map<string, number>();
    const attendancePeriodMap = new Map<string, number>();
    allAttendance.forEach(a => {
        const baseKey = `${a.channelId}_${a.staffId}`;
        attendanceMap.set(baseKey, (attendanceMap.get(baseKey) || 0) + 1);
        if (a.date) {
            const ym = new Date(a.date).toISOString().slice(0, 7);
            const periodKey = `${a.channelId}_${a.staffId}_${ym}`;
            attendancePeriodMap.set(periodKey, (attendancePeriodMap.get(periodKey) || 0) + 1);
        }
    });

    // Detailed expenses lookup
    const expenseDetails = await db.channelExpense.findMany({
        where: {
            status: { in: ['approved', 'pending'] },
            createdBy: { not: null },
        },
        select: {
            channelId: true,
            createdBy: true,
            periodMonth: true,
            category: true,
            amount: true,
            description: true,
        },
    });

    const expenseMap = new Map<string, { category: string; amount: number; description: string | null }[]>();
    const expensePeriodMap = new Map<string, { category: string; amount: number; description: string | null }[]>();
    expenseDetails.forEach(e => {
        const item = {
            category: e.category,
            amount: Number(e.amount),
            description: e.description,
        };
        const baseKey = `${e.channelId}_${e.createdBy}`;
        if (!expenseMap.has(baseKey)) expenseMap.set(baseKey, []);
        expenseMap.get(baseKey)!.push(item);

        const ym = e.periodMonth || currentMonth;
        const periodKey = `${e.channelId}_${e.createdBy}_${ym}`;
        if (!expensePeriodMap.has(periodKey)) expensePeriodMap.set(periodKey, []);
        expensePeriodMap.get(periodKey)!.push(item);
    });

    const rows = [];

    for (const cs of channelStaffs) {
        const isBranch = cs.channel.type === 'BRANCH';
        const isMonthly = cs.staff.paymentType === 'monthly';

        if (isBranch) {
            // Collect all existing periods, plus ensure currentMonth is represented
            const periodSet = new Set<string>([currentMonth, ...cs.periods.map(p => p.periodMonth)]);
            const sortedPeriods = Array.from(periodSet).sort((a, b) => b.localeCompare(a));

            for (const ym of sortedPeriods) {
                const periodRec = cs.periods.find(p => p.periodMonth === ym) || null;
                const attendanceCount = attendancePeriodMap.get(`${cs.channelId}_${cs.staffId}_${ym}`) || 0;

                const daysWorked = isMonthly
                    ? (periodRec?.daysWorkedOverride ?? 1)
                    : (periodRec?.daysWorkedOverride ?? attendanceCount);

                const dailyRate = periodRec?.dailyRateOverride != null
                    ? Number(periodRec.dailyRateOverride)
                    : Number(cs.staff.dailyRate || 0);

                const totalWage = daysWorked * dailyRate;

                const commissionRate = periodRec?.commissionOverride != null
                    ? Number(periodRec.commissionOverride)
                    : Number(cs.staff.commissionAmount || 0);

                const staffExpenses = expensePeriodMap.get(`${cs.channelId}_${cs.staffId}_${ym}`) || [];
                const expenseAmount = staffExpenses.reduce((sum, e) => sum + e.amount, 0);

                const travelExpense = staffExpenses.filter(e => e.category === 'ค่าเดินทาง').reduce((sum, e) => sum + e.amount, 0);
                const setupExpense = staffExpenses.filter(e => e.category === 'ค่าลงงาน').reduce((sum, e) => sum + e.amount, 0);
                const teardownExpense = staffExpenses.filter(e => e.category === 'ค่าเก็บงาน').reduce((sum, e) => sum + e.amount, 0);
                const otherExpense = staffExpenses.filter(e => !['ค่าเดินทาง', 'ค่าลงงาน', 'ค่าเก็บงาน'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

                const expenseDetailsStr = staffExpenses.map(e => {
                    const descSuffix = e.description && e.description !== e.category ? ` (${e.description})` : '';
                    return `${e.category}${descSuffix} ฿${e.amount.toLocaleString()}`;
                }).join(' | ');

                rows.push({
                    channelStaffId: `${cs.id}_${ym}`,
                    staffId: cs.staffId,
                    staffCode: cs.staff.code || '-',
                    name: cs.staff.name,
                    role: cs.role || 'PC',
                    isMain: cs.isMain,
                    bankName: cs.staff.bankName || '-',
                    bankAccountNo: cs.staff.bankAccountNo || '-',
                    phone: cs.staff.phone || '-',
                    paymentType: cs.staff.paymentType || 'daily',
                    isWagePaid: periodRec?.isWagePaid || false,
                    wagePaidAt: periodRec?.wagePaidAt?.toISOString() || null,
                    isCommissionPaid: periodRec?.isCommissionPaid || false,
                    commissionPaidAt: periodRec?.commissionPaidAt?.toISOString() || null,
                    isSubmitted: periodRec?.isSubmitted || false,
                    submittedAt: periodRec?.submittedAt?.toISOString() || null,
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
                    channelType: cs.channel.type,
                    periodMonth: ym,
                    channelName: `${cs.channel.name} (งวด ${formatPeriodMonthThai(ym, true)})`,
                    channelCode: cs.channel.code,
                    channelStatus: cs.channel.status,
                    startDate: cs.channel.startDate?.toISOString() || null,
                    endDate: cs.channel.endDate?.toISOString() || null,
                });
            }
        } else {
            const attendanceCount = attendanceMap.get(`${cs.channelId}_${cs.staffId}`) || 0;
            const daysWorked = isMonthly
                ? (cs.daysWorkedOverride ?? 1)
                : (cs.isSubmitted && cs.daysWorkedOverride !== null && cs.daysWorkedOverride !== undefined
                    ? cs.daysWorkedOverride
                    : attendanceCount);

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

            rows.push({
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
                channelType: cs.channel.type,
                periodMonth: null,
                channelName: cs.channel.name,
                channelCode: cs.channel.code,
                channelStatus: cs.channel.status,
                startDate: cs.channel.startDate?.toISOString() || null,
                endDate: cs.channel.endDate?.toISOString() || null,
            });
        }
    }

    // Extract unique channels for the filter dropdown
    const channels = Array.from(
        new Map(channelStaffs.map(cs => [cs.channelId, { id: cs.channelId, name: cs.channel.name, code: cs.channel.code, status: cs.channel.status }])).values()
    );

    return (
        <PayrollReportClient
            rows={rows}
            channels={channels}
            salaryAccess={salaryAccess}
        />
    );
}
