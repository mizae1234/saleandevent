import { db } from "@/lib/db";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceivingInterface } from "./ReceivingInterface";

async function getEvent(eventId: string) {
    const event = await db.event.findUnique({
        where: { id: eventId },
        include: {
            requests: {
                include: {
                    items: true
                }
            }
        }
    });
    return event;
}

export default async function ReceiveEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEvent(id);

    if (!event) {
        notFound();
    }

    // Get all items from all requests (products are typically in first request, equipment in second)
    const productRequest = event.requests[0];
    const equipmentRequest = event.requests[1];

    const productItems = productRequest?.items.map(item => ({
        id: item.id,
        productName: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: item.quantity,
        packedQuantity: item.packedQuantity,
        receivedQuantity: item.receivedQuantity
    })) || [];

    const equipmentItems = equipmentRequest?.items.map(item => ({
        id: item.id,
        productName: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: item.quantity,
        packedQuantity: item.packedQuantity,
        receivedQuantity: item.receivedQuantity
    })) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/receive"
                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">ตรวจรับสินค้า</h1>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{event.code}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="font-medium text-slate-700">{event.name}</span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Receiving Interface */}
            <ReceivingInterface
                eventId={event.id}
                eventName={event.name}
                items={productItems}
                equipment={equipmentItems}
            />
        </div>
    );
}
