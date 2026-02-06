import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { receivingData } = body;

        // Update each item with received quantity
        for (const item of receivingData) {
            await db.stockRequestItem.update({
                where: { id: item.itemId },
                data: {
                    receivedQuantity: item.receivedQuantity
                }
            });
        }

        // Update stock request status to received
        const updated = await db.stockRequest.update({
            where: { id },
            data: {
                status: 'received',
                receivedAt: new Date(),
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error receiving refill request:", error);
        return NextResponse.json(
            { error: "Failed to complete receiving" },
            { status: 500 }
        );
    }
}
