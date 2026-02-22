import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, Plus, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function PCRefillPage() {
    // Get all stock requests for active channels that this PC manages
    const requests = await db.stockRequest.findMany({
        where: {
            requestType: 'TOPUP',
        },
        include: { channel: true },
        orderBy: { createdAt: 'desc' },
    });

    const statusConfig: Record<string, { label: string; color: string }> = {
        draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-600' },
        submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
        approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
        allocated: { label: 'จัดสรรแล้ว', color: 'bg-teal-100 text-teal-700' },
        packed: { label: 'แพ็คแล้ว', color: 'bg-purple-100 text-purple-700' },
        shipped: { label: 'จัดส่งแล้ว', color: 'bg-cyan-100 text-cyan-700' },
        received: { label: 'รับแล้ว', color: 'bg-emerald-100 text-emerald-700' },
        cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">คำขอสินค้าเพิ่ม (Top-Up)</h1>
                    <p className="text-sm text-slate-500">{requests.length} คำขอทั้งหมด</p>
                </div>
                <Link href="/pc/refill/new" className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors">
                    <Plus className="h-4 w-4" /> ขอสินค้าเพิ่ม
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ยังไม่มีคำขอ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => {
                        const status = statusConfig[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
                        return (
                            <div key={req.id} className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                        <p className="text-sm text-slate-500">{req.channel.code} · {req.requestedTotalQuantity.toLocaleString()} ชิ้น</p>
                                        <p className="text-xs text-slate-400 mt-1">{format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}</p>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                                        {status.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
