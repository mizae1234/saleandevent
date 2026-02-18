import { db } from "@/lib/db";
import { SalesEventListClient } from "./SalesEventListClient";

async function getEventsWithSales() {
    // Get only events with selling or closed status that have sales
    const events = await db.salesChannel.findMany({
        where: {
            status: { in: ['active', 'closed'] }
        },
        include: {
            sales: {
                where: { status: 'active' },
                select: {
                    id: true,
                    totalAmount: true,
                    soldAt: true
                }
            }
        },
        orderBy: { startDate: 'desc' }
    });
    return events;
}

export default async function SalesEventSelectPage() {
    const events = await getEventsWithSales();

    return <SalesEventListClient events={events as any} />;
}
