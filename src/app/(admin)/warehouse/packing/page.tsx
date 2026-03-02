import { db } from "@/lib/db";
import { PackingListClient } from "./PackingListClient";

export default async function WarehousePackingPage() {
    const requests = await db.stockRequest.findMany({
        where: {
            status: { in: ['approved', 'allocated', 'packed'] },
        },
        include: {
            channel: { select: { id: true, name: true, code: true, location: true } },
            allocations: { select: { packedQuantity: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    const serialized = requests.map(r => ({
        id: r.id,
        status: r.status,
        requestType: r.requestType,
        requestedTotalQuantity: r.requestedTotalQuantity,
        createdAt: r.createdAt.toISOString(),
        allocatedTotal: r.allocations.reduce((s, a) => s + a.packedQuantity, 0),
        channel: r.channel,
    }));

    return <PackingListClient requests={serialized} />;
}
