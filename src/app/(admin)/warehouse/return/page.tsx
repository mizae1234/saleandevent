import { db } from "@/lib/db";
import { ReturnListClient } from "./ReturnListClient";

async function getReturnData() {
    const [returningEvents, returnedEvents] = await Promise.all([
        db.salesChannel.findMany({
            where: { status: 'returning' },
            include: {
                returnSummaries: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { items: true },
                },
            },
            orderBy: { updatedAt: 'asc' },
        }),
        db.salesChannel.findMany({
            where: { status: 'returned' },
            include: {
                returnSummaries: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { items: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        }),
    ]);

    const serialize = (event: any) => {
        const returnSummary = event.returnSummaries[0];
        const totalReturn = returnSummary?.items.reduce((sum: number, item: any) => sum + item.remainingQuantity, 0) || 0;
        const itemCount = returnSummary?.items.length || 0;
        return {
            id: event.id,
            name: event.name,
            code: event.code,
            location: event.location,
            status: event.status,
            startDate: event.startDate?.toISOString() || null,
            endDate: event.endDate?.toISOString() || null,
            totalReturn,
            itemCount,
        };
    };

    return {
        returning: returningEvents.map(serialize),
        returned: returnedEvents.map(serialize),
    };
}

export default async function WarehouseReturnPage() {
    const { returning, returned } = await getReturnData();
    return <ReturnListClient returning={returning} returned={returned} />;
}
