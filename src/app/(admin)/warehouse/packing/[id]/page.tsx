import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import PackingInterface from "./PackingInterface";

export default async function PackingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // id here is the stock request ID
    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: { include: { product: true } },
        },
    });

    if (!request || !['allocated', 'packed'].includes(request.status)) {
        notFound();
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <Link href="/warehouse/packing" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" /> แพ็คสินค้า — {request.channel.name}
                </h1>
                <p className="text-sm text-slate-500">{request.channel.code} · {request.requestType}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <PackingInterface
                    requestId={request.id}
                    requestedTotal={request.requestedTotalQuantity}
                    status={request.status}
                    allocations={request.allocations.map(a => ({
                        id: a.id,
                        barcode: a.barcode,
                        size: a.size,
                        packedQuantity: a.packedQuantity,
                        price: Number(a.price),
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
