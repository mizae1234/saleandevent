import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Update status to 'packed' (ready for shipping)
        const updated = await db.stockRequest.update({
            where: { id },
            data: {
                status: 'packed',
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

