import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, ArrowRight, Calendar, TrendingUp, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";
import { CloseListClient } from "./CloseListClient";

async function getEventsForClose() {
    const events = await db.salesChannel.findMany({
        where: {
            status: { in: ['active', 'selling', 'closed', 'returned', 'shipped', 'received', 'packing'] }
        },
        include: {
            stock: { select: { quantity: true, soldQuantity: true } },
            _count: { select: { sales: true } },
        },
        orderBy: { startDate: 'desc' }
    });

    const salesAggs = await db.sale.groupBy({
        by: ['channelId'],
        where: {
            channelId: { in: events.map(e => e.id) },
            status: 'active',
        },
        _sum: { totalAmount: true },
    });
    const salesMap = new Map(salesAggs.map(a => [a.channelId, Number(a._sum.totalAmount || 0)]));

    return events.map((event) => {
        const totalStock = event.stock.reduce((sum, s) => sum + s.quantity, 0);
        const soldQuantity = event.stock.reduce((sum, s) => sum + s.soldQuantity, 0);
        const totalSales = salesMap.get(event.id) || 0;
        return {
            id: event.id,
            name: event.name,
            code: event.code,
            location: event.location,
            status: event.status,
            startDate: event.startDate?.toISOString() || null,
            endDate: event.endDate?.toISOString() || null,
            salesCount: event._count.sales,
            totalStock,
            soldQuantity,
            remainingStock: totalStock - soldQuantity,
            totalSales,
        };
    });
}

export default async function CloseEventListPage() {
    const events = await getEventsForClose();
    return <CloseListClient events={events} />;
}
