import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, Upload, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function WarehousePackingPage() {
    // Show approved and allocated requests (ready for packing/allocation)
    const requests = await db.stockRequest.findMany({
        where: {
            status: { in: ['approved', 'allocated', 'packed'] },
        },
        include: {
            channel: true,
            allocations: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    const statusConfig: Record<string, { label: string; color: string; action: string }> = {
        approved: { label: 'รอจัดสรร', color: 'bg-amber-100 text-amber-700', action: 'อัพโหลด Excel' },
        allocated: { label: 'จัดสรรแล้ว', color: 'bg-indigo-100 text-indigo-700', action: 'แพ็คสินค้า' },
        packed: { label: 'แพ็คแล้ว', color: 'bg-emerald-100 text-emerald-700', action: 'ดูรายละเอียด' },
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">คลัง — จัดสรร & แพ็คสินค้า</h1>
                <p className="text-sm text-slate-500">{requests.length} รายการ</p>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ไม่มีคำขอ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => {
                        const config = statusConfig[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600', action: '' };
                        const allocatedTotal = req.allocations.reduce((s, a) => s + a.packedQuantity, 0);
                        const targetUrl = req.status === 'approved'
                            ? `/warehouse/allocate/${req.id}`
                            : `/channels/${req.id}/packing`;

                        return (
                            <Link key={req.id} href={targetUrl} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {req.channel.code} · ขอ {req.requestedTotalQuantity} ชิ้น
                                            {allocatedTotal > 0 && ` · จัดสรร ${allocatedTotal} ชิ้น`}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">{format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-indigo-600 font-medium">{config.action}</span>
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
