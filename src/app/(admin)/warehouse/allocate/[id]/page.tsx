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
                    <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 font-semibold text-indigo-900 flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span>รายการที่ขอเข้ามา (อ้างอิง)</span>
                            <span className="text-indigo-600 bg-white px-2 py-0.5 rounded text-xs border border-indigo-100">รวม {request.requestedTotalQuantity} ชิ้น</span>
                        </div>
                        <Link href={`/warehouse/allocate/${request.id}/edit-request`} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-1.5 shadow-sm">
                            <span>🛠️ ตรวจสอบ / แก้ไขรายการขอเบิก</span>
                        </Link>
                    </div>
                </div>
            )}

            <AllocationUpload
                requestId={request.id}
                channelName={request.channel.name}
                requestedTotal={request.requestedTotalQuantity}
                requestedItems={request.items.map(item => ({
                    ...item,
                    product: {
                        ...item.product,
                        price: Number(item.product.price) || 0,
                    }
                }))}
            />
        </div>
    );
}
