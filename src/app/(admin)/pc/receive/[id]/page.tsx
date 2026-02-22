import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import ReceivingInterface from "./ReceivingInterface";

export default async function ReceiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: { include: { product: true } },
            shipment: true,
        },
    });

    if (!request || request.status !== 'shipped') {
        notFound();
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <Link href="/pc/receive" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-emerald-500" /> รับสินค้า — {request.channel.name}
                </h1>
                <p className="text-sm text-slate-500">
                    {request.channel.code} · {request.requestType} · ขนส่ง: {request.shipment?.provider} {request.shipment?.trackingNumber && `(${request.shipment.trackingNumber})`}
                </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <ReceivingInterface
                    requestId={request.id}
                    allocations={request.allocations.map(a => ({
                        barcode: a.barcode,
                        size: a.size,
                        packedQuantity: a.packedQuantity,
                        product: {
                            name: a.product.name,
                            code: a.product.code,
                            color: a.product.color,
                            producttype: a.product.producttype,
                        },
                    }))}
                />
            </div>
        </div>
    );
}
