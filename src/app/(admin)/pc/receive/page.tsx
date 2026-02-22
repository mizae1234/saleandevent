import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, Truck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function PCReceivePage() {
    const shippedRequests = await db.stockRequest.findMany({
        where: { status: 'shipped' },
        include: {
            channel: true,
            shipment: true,
            allocations: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">รับสินค้า</h1>
                <p className="text-sm text-slate-500">{shippedRequests.length} รายการรอรับ</p>
            </div>

            {shippedRequests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ไม่มีสินค้ารอรับ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {shippedRequests.map(req => {
                        const totalPacked = req.allocations.reduce((s, a) => s + a.packedQuantity, 0);
                        return (
                            <Link key={req.id} href={`/pc/receive/${req.id}`} className="block bg-white rounded-xl p-4 hover:border-teal-300 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">{req.channel.code} · {totalPacked} ชิ้น</p>
                                        {req.shipment && (
                                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                                <Truck className="h-3.5 w-3.5" />
                                                {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                            </div>
                                        )}
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-400" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
