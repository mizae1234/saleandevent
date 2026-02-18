import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const event = await db.salesChannel.findUnique({
            where: { id },
            include: {
                staff: true,
                stock: true,
                stockRequests: {
                    include: {
                        allocations: true,
                        shipment: true,
                        receiving: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: event.id,
            type: event.type,
            name: event.name,
            code: event.code,
            location: event.location,
            phone: event.phone,
            status: event.status,
            salesTarget: event.salesTarget,
            startDate: event.startDate?.toISOString() || null,
            endDate: event.endDate?.toISOString() || null,
            staff: event.staff.map((s: any) => ({
                staffId: s.staffId,
                role: s.role,
            })),
            stock: event.stock,
            stockRequests: event.stockRequests,
        });
    } catch (error) {
        console.error("Failed to fetch event:", error);
        return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
    }
}
