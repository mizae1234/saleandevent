import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import AllocationUpload from "./AllocationUpload";

export default async function AllocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: { include: { product: true } },
            items: { include: { product: true } },
        },
    });

    if (!request || !['approved', 'allocated'].includes(request.status)) {
        notFound();
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <Link href="/warehouse/packing" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" /> จัดสรรสินค้า
                </h1>
                <p className="text-sm text-slate-500">{request.channel.name} ({request.channel.code}) · {request.requestType === 'TOPUP' ? 'เบิกเพิ่ม (Top-Up)' : 'เบิกครั้งแรก (Initial)'}</p>
            </div>

            {/* Requested Items Reference for TOPUP */}
            {request.items && request.items.length > 0 && (
                <div className="bg-white border text-sm border-indigo-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 font-semibold text-indigo-900 flex justify-between items-center">
                        <span>รายการที่ขอเข้ามา (อ้างอิง)</span>
                        <span className="text-indigo-600 bg-white px-2 py-0.5 rounded text-xs border border-indigo-100">{request.requestedTotalQuantity} ชิ้น</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {request.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-50">
                                <div>
                                    <p className="font-semibold text-slate-800">{item.product.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.product.code || item.barcode}</span>
                                        <span className="text-xs text-slate-500">{item.product.size} {item.product.color}</span>
                                    </div>
                                    {item.notes && <p className="text-xs text-indigo-600 mt-1">หมายเหตุ: {item.notes}</p>}
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-indigo-700">{item.quantity}</span> <span className="text-xs text-slate-500">ชิ้น</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AllocationUpload
                requestId={request.id}
                channelName={request.channel.name}
                requestedTotal={request.requestedTotalQuantity}
                requestedItems={request.items}
            />
        </div>
    );
}
