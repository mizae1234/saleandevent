import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, Plus } from "lucide-react";

export default async function EmployeeRefillPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) notFound();

    // Get refill requests for this channel only
    const requests = await db.stockRequest.findMany({
        where: {
            channelId,
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
        <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/channel/${channelId}/pos`}
                        className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">เบิกของเพิ่ม</h1>
                        <p className="text-xs text-slate-400">{channel.name} — {requests.length} คำขอ</p>
                    </div>
                </div>
                <Link
                    href={`/channel/${channelId}/pos/refill/new`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-medium hover:bg-teal-700 transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" /> ขอเพิ่ม
                </Link>
            </div>

            {requests.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-500">ยังไม่มีคำขอ</p>
                    <p className="text-xs text-slate-400 mt-1">กดปุ่ม &quot;ขอเพิ่ม&quot; เพื่อสร้างคำขอใหม่</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => {
                        const status = statusConfig[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
                        return (
                            <div key={req.id} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-slate-900">{req.requestedTotalQuantity.toLocaleString()} ชิ้น</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}
                                        </p>
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
