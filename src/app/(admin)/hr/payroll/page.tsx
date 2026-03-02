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

    const serialized = events.map(e => ({
        id: e.id,
        name: e.name,
        code: e.code,
        location: e.location,
        status: e.status,
        startDate: e.startDate?.toISOString() || null,
        endDate: e.endDate?.toISOString() || null,
        staffCount: e._count.staff,
    }));

    return <PayrollListClient events={serialized} />;
}
