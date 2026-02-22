import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Fix stuck channels: if stock request is 'received' but channel is not 'active'
export async function POST() {
    try {
        // Find channels with received stock requests that are not active
        const stuckChannels = await db.salesChannel.findMany({
            where: {
                status: { not: 'active' },
                stockRequests: {
                    some: { status: 'received' }
                }
            },
            select: { id: true, name: true, status: true }
        });

        // Update them to active
        for (const channel of stuckChannels) {
            await db.salesChannel.update({
                where: { id: channel.id },
                data: { status: 'active' },
            });
        }

        return NextResponse.json({
            fixed: stuckChannels.length,
            channels: stuckChannels,
        });
    } catch (error) {
        console.error("Failed:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
