import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const event = await db.event.findUnique({
            where: { id },
            include: {
                staff: true,
                requests: {
                    include: {
                        items: true
                    }
                }
            }
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Transform data for easy consumption by the edit form
        const response = {
            id: event.id,
            name: event.name,
            code: event.code,
            location: event.location,
            status: event.status,
            startDate: event.startDate.toISOString(),
            endDate: event.endDate.toISOString(),
            staff: event.staff.map(s => ({
                staffId: s.staffId,
                role: s.role
            })),
            // First request is products, second is equipment (based on create logic)
            products: event.requests[0]?.items?.map(item => ({
                barcode: item.barcode,
                quantity: item.quantity,
                productName: item.productName,
                size: item.size
            })) || [],
            equipment: event.requests[1]?.items?.map(item => ({
                barcode: item.barcode,
                quantity: item.quantity,
                productName: item.productName
            })) || []
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Failed to fetch event:", error);
        return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
    }
}
