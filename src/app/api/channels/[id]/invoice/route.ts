import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Fetch all shipped/received stock requests for this channel with full allocation + product data
    const stockRequests = await db.stockRequest.findMany({
        where: {
            channelId: id,
            status: { in: ["shipped", "received"] },
        },
        include: {
            channel: {
                select: { name: true, code: true, location: true },
            },
            shipment: {
                select: { shippedAt: true, provider: true, trackingNumber: true },
            },
            allocations: {
                include: {
                    product: {
                        select: {
                            code: true,
                            name: true,
                            size: true,
                            color: true,
                            producttype: true,
                        },
                    },
                },
                orderBy: { barcode: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    if (stockRequests.length === 0) {
        return NextResponse.json(
            { error: "No shipped/received shipments found" },
            { status: 404 }
        );
    }

    const channel = stockRequests[0].channel;

    // Build invoice items from all shipments
    const shipments = stockRequests.map((req, idx) => ({
        shipmentNumber: idx + 1,
        requestType: req.requestType,
        shippedAt: req.shipment?.shippedAt?.toISOString() || null,
        provider: req.shipment?.provider || null,
        trackingNumber: req.shipment?.trackingNumber || null,
        items: req.allocations.map((alloc) => ({
            barcode: alloc.barcode,
            code: alloc.product.code || alloc.barcode,
            name: alloc.product.name,
            producttype: alloc.product.producttype || "",
            color: alloc.product.color || "",
            size: alloc.product.size || "",
            packedQuantity: alloc.packedQuantity,
            invoiceQuantity: Math.floor(alloc.packedQuantity * 0.7),
            unitPrice: Number(alloc.price),
        })),
    }));

    return NextResponse.json({
        channel: {
            name: channel.name,
            code: channel.code,
            location: channel.location,
        },
        shipments,
    });
}
