import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { provider, trackingNo } = body;

        // Update stock request to shipped status
        const updated = await db.stockRequest.update({
            where: { id },
            data: {
                status: 'shipped',
                shipmentProvider: provider,
                trackingNo: trackingNo || null,
                shippedAt: new Date(),
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error shipping refill request:", error);
        return NextResponse.json(
            { error: "Failed to create shipment" },
            { status: 500 }
        );
    }
}
