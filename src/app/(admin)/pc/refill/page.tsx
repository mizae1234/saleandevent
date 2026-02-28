import { db } from "@/lib/db";
import { RefillListClient } from "./RefillListClient";

export default async function PCRefillPage() {
    const [requests, channelsRaw] = await Promise.all([
        db.stockRequest.findMany({
            where: { requestType: "TOPUP" },
            include: {
                channel: {
                    select: { id: true, name: true, code: true, location: true },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        db.salesChannel.findMany({
            where: { status: { in: ["active", "approved"] } },
            select: { id: true, name: true, code: true, location: true },
            orderBy: { name: "asc" },
        }),
    ]);

    // Serialize dates as ISO strings for the client component
    const serialized = requests.map((r) => ({
        id: r.id,
        channelId: r.channelId,
        status: r.status,
        requestedTotalQuantity: r.requestedTotalQuantity,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        channel: r.channel,
    }));

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <RefillListClient
                requests={serialized}
                channels={channelsRaw}
            />
        </div>
    );
}
