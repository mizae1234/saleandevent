import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Update status to packing (or directly to shipped for simplicity)
        const updated = await db.stockRequest.update({
            where: { id },
            data: {
                status: 'packing',
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error packing refill request:", error);
        return NextResponse.json(
            { error: "Failed to update packing status" },
            { status: 500 }
        );
    }
}
