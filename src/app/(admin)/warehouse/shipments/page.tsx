import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ShipmentsListClient } from "./ShipmentsListClient";

export default async function WarehouseShipmentsPage() {
    const [packedRequests, shippedRequests, receivedRequests] = await Promise.all([
        db.stockRequest.findMany({
            where: { status: 'packed' },
            include: {
                channel: { select: { id: true, name: true, code: true, location: true } },
                allocations: { select: { packedQuantity: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'shipped' },
            include: {
                channel: { select: { id: true, name: true, code: true, location: true } },
                shipment: { select: { provider: true, trackingNumber: true, shippedAt: true } },
                allocations: { select: { packedQuantity: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'received' },
            include: {
                channel: { select: { id: true, name: true, code: true } },
                shipment: { select: { provider: true, trackingNumber: true, shippedAt: true } },
                allocations: { select: { packedQuantity: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        }),
    ]);

    const serialize = (req: any) => ({
        id: req.id,
        channelId: req.channelId,
        status: req.status,
        requestType: req.requestType,
        totalPacked: req.allocations.reduce((s: number, a: any) => s + a.packedQuantity, 0),
        channel: req.channel,
        shipment: req.shipment ? {
            provider: req.shipment.provider,
            trackingNumber: req.shipment.trackingNumber,
            shippedAt: req.shipment.shippedAt?.toISOString() || null,
        } : null,
    });

    return (
        <ShipmentsListClient
            packed={packedRequests.map(serialize)}
            shipped={shippedRequests.map(serialize)}
            received={receivedRequests.map(serialize)}
        />
    );
}
