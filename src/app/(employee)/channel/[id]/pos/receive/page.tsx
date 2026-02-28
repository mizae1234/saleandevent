import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, Truck, CheckCircle2, History, ChevronRight } from "lucide-react";
import ReceivingInterface from "@/app/(admin)/pc/receive/[id]/ReceivingInterface";

export default async function EmployeeReceivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const [channel, requests, receivedRequests] = await Promise.all([
        db.salesChannel.findUnique({ where: { id: channelId }, select: { id: true, name: true } }),
        // Pending: shipped, waiting to receive
        db.stockRequest.findMany({
            where: { channelId, status: 'shipped' },
            include: {
                channel: true,
                shipment: true,
                allocations: { include: { product: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        // History: already received
        db.stockRequest.findMany({
            where: { channelId, status: 'received' },
            include: {
                receiving: { select: { id: true, receivedTotalQty: true, receivedAt: true } },
                shipment: { select: { provider: true, trackingNumber: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 20,
        }),
    ]);

    if (!channel) notFound();

    return (
        <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}/pos`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-base font-bold text-slate-900">รับสินค้าเข้า</h1>
                    <p className="text-xs text-slate-400">{channel.name} — {requests.length} รายการรอรับ</p>
                </div>
            </div>

            {/* Pending Section */}
            {requests.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-500">ไม่มีสินค้ารอรับ</p>
                    <p className="text-xs text-slate-400 mt-1">สินค้าที่จัดส่งแล้วจะแสดงที่นี่</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => {
                        const totalPacked = req.allocations.reduce((s, a) => s + a.packedQuantity, 0);
                        return (
                            <div key={req.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                                {/* Request Header */}
                                <div className="p-4 border-b border-slate-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {req.requestType === 'INITIAL' ? 'สินค้าเริ่มต้น' : 'ของเพิ่ม'}
                                        </span>
                                        <span className="text-xs text-slate-400">{totalPacked} ชิ้น</span>
                                    </div>
                                    {req.shipment && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Truck className="h-3.5 w-3.5" />
                                            {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                        </div>
                                    )}
                                </div>

                                {/* Receiving Interface */}
                                <div className="p-4">
                                    <ReceivingInterface
                                        requestId={req.id}
                                        redirectTo={`/channel/${channelId}/pos/receive`}
                                        allocations={req.allocations.map(a => ({
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
                    })}
                </div>
            )}

            {/* History Section */}
            {receivedRequests.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <History className="h-4 w-4 text-slate-400" />
                        ประวัติการรับสินค้า
                    </h2>
                    <div className="space-y-2">
                        {receivedRequests.map(req => (
                            <Link
                                key={req.id}
                                href={`/channel/${channelId}/pos/receive/history/${req.receiving?.id || req.id}`}
                                className="block bg-white rounded-xl p-3 border border-slate-100 border-l-4 border-l-emerald-400 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                <CheckCircle2 className="h-3 w-3" />
                                                รับแล้ว {req.receiving?.receivedTotalQty || 0} ชิ้น
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                                            {req.shipment && (
                                                <span className="flex items-center gap-1">
                                                    <Truck className="h-3 w-3" />
                                                    {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                                </span>
                                            )}
                                            {req.receiving?.receivedAt && (
                                                <span>{format(req.receiving.receivedAt, 'd MMM yy HH:mm', { locale: th })}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
