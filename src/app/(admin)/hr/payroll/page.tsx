import { db } from "@/lib/db";
import { PayrollListClient } from "./PayrollListClient";
import {
    getCurrentPeriodMonth,
    isValidPeriodMonth,
    getPeriodMonthOptions,
} from "@/lib/payroll-period";

export default async function PayrollEventSelectPage({
    searchParams,
}: {
    searchParams: Promise<{ period?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const currentMonth = getCurrentPeriodMonth();
    const periodMonth = isValidPeriodMonth(resolvedSearchParams.period)
        ? resolvedSearchParams.period
        : currentMonth;

    const events = await db.salesChannel.findMany({
        where: {
            status: { notIn: ['draft'] },
        },
        include: {
            _count: { select: { staff: true } },
        },
        orderBy: [
            { type: 'asc' },
            { startDate: 'desc' },
        ],
    });

    const eventChannelIds = events.filter(e => e.type !== 'BRANCH').map(e => e.id);
    const branchChannelIds = events.filter(e => e.type === 'BRANCH').map(e => e.id);

    const [
        wagePaidAgg,
        comPaidAgg,
        submittedAgg,
        branchWagePaidAgg,
        branchComPaidAgg,
        branchSubmittedAgg,
    ] = await Promise.all([
        eventChannelIds.length > 0
            ? db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: eventChannelIds }, isWagePaid: true },
                _count: true,
            })
            : Promise.resolve([]),
        eventChannelIds.length > 0
            ? db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: eventChannelIds }, isCommissionPaid: true },
                _count: true,
            })
            : Promise.resolve([]),
        eventChannelIds.length > 0
            ? db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: eventChannelIds }, isSubmitted: true },
                _count: true,
            })
            : Promise.resolve([]),
        branchChannelIds.length > 0
            ? db.channelStaffPeriod.groupBy({
                by: ['channelId'],
                where: { channelId: { in: branchChannelIds }, periodMonth, isWagePaid: true },
                _count: true,
            })
            : Promise.resolve([]),
        branchChannelIds.length > 0
            ? db.channelStaffPeriod.groupBy({
                by: ['channelId'],
                where: { channelId: { in: branchChannelIds }, periodMonth, isCommissionPaid: true },
                _count: true,
            })
            : Promise.resolve([]),
        branchChannelIds.length > 0
            ? db.channelStaffPeriod.groupBy({
                by: ['channelId'],
                where: { channelId: { in: branchChannelIds }, periodMonth, isSubmitted: true },
                _count: true,
            })
            : Promise.resolve([]),
    ]);

    const wagePaidMap = new Map<string, number>([
        ...wagePaidAgg.map(a => [a.channelId, a._count] as [string, number]),
        ...branchWagePaidAgg.map(a => [a.channelId, a._count] as [string, number]),
    ]);
    const comPaidMap = new Map<string, number>([
        ...comPaidAgg.map(a => [a.channelId, a._count] as [string, number]),
        ...branchComPaidAgg.map(a => [a.channelId, a._count] as [string, number]),
    ]);
    const submittedMap = new Map<string, number>([
        ...submittedAgg.map(a => [a.channelId, a._count] as [string, number]),
        ...branchSubmittedAgg.map(a => [a.channelId, a._count] as [string, number]),
    ]);

    const serialized = events.map(e => ({
        id: e.id,
        type: e.type || 'EVENT',
        name: e.name,
        code: e.code,
        location: e.location,
        status: e.status,
        startDate: e.startDate?.toISOString() || null,
        endDate: e.endDate?.toISOString() || null,
        staffCount: e._count.staff,
        wagePaid: wagePaidMap.get(e.id) || 0,
        comPaid: comPaidMap.get(e.id) || 0,
        submitted: submittedMap.get(e.id) || 0,
    }));

    return (
        <PayrollListClient
            events={serialized}
            periodMonth={periodMonth}
            periodOptions={getPeriodMonthOptions(11, 2)}
        />
    );
}
