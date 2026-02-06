import { db } from "@/lib/db";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RefillReceivingInterface } from "./RefillReceivingInterface";

async function getRefillRequest(id: string) {
    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                        }
                    }
                }
            }
        }
    });
    return request;
}

export default async function ReceiveRefillPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const request = await getRefillRequest(id);

    if (!request) {
        notFound();
    }

    // Transform items for the receiving interface
    const items = request.items.map(item => ({
        id: item.id,
        productName: item.product.name,
        barcode: item.barcode,
        size: item.product.size,
        quantity: item.quantity, // requested qty
        packedQuantity: item.quantity, // for refill, assume packed = requested qty
        receivedQuantity: null
    }));

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
                        <h1 className="text-2xl font-bold text-slate-900">ตรวจรับสินค้า - เบิกเพิ่ม</h1>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            <RefreshCw className="h-3 w-3" />
                            เบิกเพิ่ม
                        </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="font-medium text-slate-700">{request.event.name}</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{request.event.code}</span>
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {request.event.location}
                        </span>
                        {request.shippedAt && (
                            <span className="text-xs text-slate-400">
                                ส่ง: {format(new Date(request.shippedAt), 'd MMM HH:mm', { locale: th })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Receiving Interface */}
            <RefillReceivingInterface
                requestId={request.id}
                eventName={request.event.name}
                items={items}
            />
        </div>
    );
}
