import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const channel = await db.salesChannel.findUnique({
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

        if (!channel) {
            return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: channel.id,
            type: channel.type,
            name: channel.name,
            code: channel.code,
            location: channel.location,
            phone: channel.phone,
            status: channel.status,
            salesTarget: channel.salesTarget,
            startDate: channel.startDate?.toISOString() || null,
            endDate: channel.endDate?.toISOString() || null,
            responsiblePersonName: channel.responsiblePersonName,
            customerId: channel.customerId,
            staff: channel.staff.map((s: any) => ({
                staffId: s.staffId,
                isMain: s.isMain,
            })),
            stock: channel.stock,
            stockRequests: channel.stockRequests,
        });
    } catch (error) {
        console.error("Failed to fetch channel:", error);
        return NextResponse.json({ error: "Failed to fetch channel" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updated = await db.salesChannel.update({
            where: { id },
            data: {
                name: body.name,
                location: body.location,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null,
                salesTarget: body.salesTarget ? parseFloat(body.salesTarget) : null,
                responsiblePersonName: body.responsiblePersonName || null,
                phone: body.phone || null,
                customerId: body.customerId || null,
            },
        });

        return NextResponse.json({ success: true, id: updated.id });
    } catch (error) {
        console.error("Failed to update channel:", error);
        return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
    }
}
