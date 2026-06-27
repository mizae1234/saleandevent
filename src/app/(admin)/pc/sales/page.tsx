import { db } from "@/lib/db";
import { SalesEventListClient } from "./SalesEventListClient";

async function getEventsWithSales() {
    // Get only events with selling or closed status that have sales
    const events = await db.salesChannel.findMany({
        where: {
            status: { notIn: ['draft', 'submitted'] }
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

    return events.map(e => ({
        ...e,
        salesTarget: e.salesTarget !== null ? Number(e.salesTarget) : null,
        sales: e.sales.map(s => ({
            ...s,
            totalAmount: Number(s.totalAmount)
        }))
    }));
}

export default async function SalesEventSelectPage() {
    const events = await getEventsWithSales();

    return <SalesEventListClient events={events as any} />;
}
