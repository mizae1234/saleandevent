import { db } from "@/lib/db";
import { ReceiveClient } from "./ReceiveClient";

export default async function PCReceivePage() {
    const [shippedRequests, allReceivedRequests, totalReceived] = await Promise.all([
        db.stockRequest.findMany({
            where: { status: 'shipped' },
            include: {
                channel: { select: { id: true, name: true, code: true } },
                shipment: { select: { provider: true, trackingNumber: true } },
                allocations: { select: { packedQuantity: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'received' },
            include: {
                channel: { select: { id: true, name: true, code: true } },
                receiving: { select: { id: true, receivedTotalQty: true, receivedAt: true } },
                shipment: { select: { provider: true, trackingNumber: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        db.stockRequest.count({ where: { status: 'received' } }),
    ]);

    return (
        <ReceiveClient
            shippedRequests={shippedRequests.map(req => ({
                id: req.id,
                requestType: req.requestType,
                channel: req.channel,
                shipment: req.shipment,
                totalPacked: req.allocations.reduce((s, a) => s + a.packedQuantity, 0),
                updatedAt: req.updatedAt.toISOString(),
            }))}
            receivedRequests={allReceivedRequests.map(req => ({
                id: req.id,
                requestType: req.requestType,
                channel: req.channel,
                shipment: req.shipment,
                receivedTotalQty: req.receiving?.receivedTotalQty || 0,
                receivedAt: req.receiving?.receivedAt?.toISOString() || null,
                receivingId: req.receiving?.id || null,
                updatedAt: req.updatedAt.toISOString(),
            }))}
            totalReceived={totalReceived}
        />
    );
}
