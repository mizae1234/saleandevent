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
            latitude: channel.latitude,
            longitude: channel.longitude,
            checkInRadiusKm: channel.checkInRadiusKm,
            workStartTime: channel.workStartTime || "10:00",
            workEndTime: channel.workEndTime || "21:00",
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
                isCashBooth: body.isCashBooth !== undefined ? body.isCashBooth : undefined,
                latitude: body.latitude !== undefined ? (body.latitude !== null && body.latitude !== '' ? parseFloat(String(body.latitude)) : null) : undefined,
                longitude: body.longitude !== undefined ? (body.longitude !== null && body.longitude !== '' ? parseFloat(String(body.longitude)) : null) : undefined,
                checkInRadiusKm: body.checkInRadiusKm !== undefined && body.checkInRadiusKm !== '' ? parseFloat(String(body.checkInRadiusKm)) : undefined,
                workStartTime: body.workStartTime !== undefined ? (body.workStartTime || '10:00') : undefined,
                workEndTime: body.workEndTime !== undefined ? (body.workEndTime || '21:00') : undefined,
            },
        });

        return NextResponse.json({ success: true, id: updated.id });
    } catch (error) {
        console.error("Failed to update channel:", error);
        return NextResponse.json({ error: "Failed to update channel" }, { status: 500 });
    }
}
