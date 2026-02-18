import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Truck, ArrowRight, History } from "lucide-react";
import Link from "next/link";

export default async function WarehouseShipmentsPage() {
    // Packed requests ready to ship
    const packedRequests = await db.stockRequest.findMany({
        where: { status: 'packed' },
        include: {
            channel: true,
            allocations: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Shipped requests (in transit)
    const shippedRequests = await db.stockRequest.findMany({
        where: { status: 'shipped' },
        include: {
            channel: true,
            shipment: true,
            allocations: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Recent received (history)
    const receivedRequests = await db.stockRequest.findMany({
        where: { status: 'received' },
        include: {
            channel: true,
            shipment: true,
            allocations: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
    });

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดส่งสินค้า</h1>
                <p className="text-sm text-slate-500">จัดการและติดตามการจัดส่งสินค้า</p>
            </div>

            {/* Ready to Ship */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    พร้อมจัดส่ง ({packedRequests.length})
                </h2>
                {packedRequests.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                        <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">ไม่มีรายการรอจัดส่ง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {packedRequests.map(req => {
                            const totalPacked = req.allocations.reduce((s: number, a: any) => s + a.packedQuantity, 0);
                            return (
                                <Link key={req.id} href={`/channels/${req.id}/shipping`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors border-l-4 border-l-blue-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span><MapPin className="h-3.5 w-3.5 inline" /> {req.channel.location}</span>
                                                <span><Package className="h-3.5 w-3.5 inline" /> {totalPacked} ชิ้น</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">พร้อมจัดส่ง</span>
                                            <ArrowRight className="h-4 w-4 text-slate-400" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* In Transit */}
            {shippedRequests.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        กำลังจัดส่ง ({shippedRequests.length})
                    </h2>
                    <div className="space-y-3">
                        {shippedRequests.map(req => {
                            const totalPacked = req.allocations.reduce((s: number, a: any) => s + a.packedQuantity, 0);
                            return (
                                <Link key={req.id} href={`/channels/${req.channelId}`} className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors border-l-4 border-l-purple-500">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                                <span className="text-xs font-mono text-slate-400">{req.channel.code}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {req.shipment?.provider}</span>
                                                {req.shipment?.trackingNumber && <span className="text-xs font-mono text-blue-600">#{req.shipment.trackingNumber}</span>}
                                                <span><Package className="h-3.5 w-3.5 inline" /> {totalPacked} ชิ้น</span>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                                            <Truck className="h-3 w-3" /> กำลังส่ง
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* History */}
            <section className="border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-500" /> ประวัติการจัดส่ง
                </h2>
                {receivedRequests.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-8 text-center">
                        <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">ยังไม่มีประวัติ</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {receivedRequests.map(req => {
                            const totalPacked = req.allocations.reduce((s: number, a: any) => s + a.packedQuantity, 0);
                            return (
                                <Link key={req.id} href={`/channels/${req.channelId}`} className="block bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-300 transition-colors border-l-4 border-l-emerald-400">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-slate-900">{req.channel.name} <span className="text-xs text-slate-400">{req.channel.code}</span></h3>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                <span>{req.shipment?.provider} {req.shipment?.trackingNumber && `· ${req.shipment.trackingNumber}`}</span>
                                                <span>{totalPacked} ชิ้น</span>
                                                {req.shipment?.shippedAt && <span>{format(req.shipment.shippedAt, 'd MMM yy', { locale: th })}</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">รับแล้ว</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
