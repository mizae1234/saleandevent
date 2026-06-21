import { db } from "@/lib/db";
import { PayrollListClient } from "./PayrollListClient";

export default async function PayrollEventSelectPage() {
    const events = await db.salesChannel.findMany({
        where: {
            status: { notIn: ['draft'] },
        },
        include: {
            _count: { select: { staff: true } },
        },
        orderBy: { startDate: 'desc' },
    });

    // Batch query: payment progress per channel
    const channelIds = events.map(e => e.id);
    const [wagePaidAgg, comPaidAgg, submittedAgg] = channelIds.length > 0
        ? await Promise.all([
            db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: channelIds }, isWagePaid: true },
                _count: true,
            }),
            db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: channelIds }, isCommissionPaid: true },
                _count: true,
            }),
            db.channelStaff.groupBy({
                by: ['channelId'],
                where: { channelId: { in: channelIds }, isSubmitted: true },
                _count: true,
            }),
        ])
        : [[], [], []];

    const wagePaidMap = new Map(wagePaidAgg.map(a => [a.channelId, a._count]));
    const comPaidMap = new Map(comPaidAgg.map(a => [a.channelId, a._count]));
    const submittedMap = new Map(submittedAgg.map(a => [a.channelId, a._count]));

    const serialized = events.map(e => ({
        id: e.id,
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

    return <PayrollListClient events={serialized} />;
}
