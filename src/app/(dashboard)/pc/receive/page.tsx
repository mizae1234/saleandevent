import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Calendar, ArrowRight, PackageCheck, Truck, RefreshCw } from "lucide-react";
import Link from "next/link";

async function getShippedEvents() {
    const events = await db.event.findMany({
        where: {
            status: 'shipped'
        },
        include: {
            requests: {
                include: {
                    items: true
                }
            }
        },
        orderBy: { startDate: 'asc' }
    });
    return events;
}

async function getShippedRefillRequests() {
    const requests = await db.stockRequest.findMany({
        where: {
            status: 'shipped'
        },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                        }
                    }
                }
            }
        },
        orderBy: { shippedAt: 'asc' }
    });
    return requests;
}

export default async function ReceiveGoodsPage() {
    const [events, refillRequests] = await Promise.all([
        getShippedEvents(),
        getShippedRefillRequests()
    ]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รับสินค้าเข้า</h1>
                <p className="text-slate-500">รายการ Event และคำขอเบิกเพิ่มที่ส่งของมาแล้ว รอตรวจรับสินค้า</p>
            </div>

            {/* Shipped Refill Requests */}
            {refillRequests.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        เบิกเพิ่ม - รอรับ ({refillRequests.length})
                    </h2>

                    <div className="space-y-3">
                        {refillRequests.map((request) => {
                            const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
                            return (
                                <Link
                                    key={request.id}
                                    href={`/pc/receive/refill/${request.id}`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                    <RefreshCw className="h-3 w-3" />
                                                    เบิกเพิ่ม
                                                </span>
                                                <h3 className="font-semibold text-slate-900">{request.event.name}</h3>
                                                <span className="text-xs font-mono text-slate-400">{request.event.code}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {request.event.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Package className="h-4 w-4" />
                                                    {request.items.length} รายการ ({totalItems} ชิ้น)
                                                </span>
                                                {request.shippedAt && (
                                                    <span className="text-xs text-slate-400">
                                                        <Truck className="inline h-3 w-3 mr-1" />
                                                        ส่ง: {format(new Date(request.shippedAt), 'd MMM HH:mm', { locale: th })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                                                <Truck className="mr-1 h-3 w-3" />
                                                ส่งมาแล้ว
                                            </span>
                                            <ArrowRight className="h-5 w-5 text-slate-400" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Events Ready to Receive */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    Event รอตรวจรับ ({events.length})
                </h2>

                {events.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <PackageCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มีรายการ Event รอตรวจรับ</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => {
                            const totalItems = event.requests.reduce(
                                (sum, req) => sum + req.items.reduce((s, item) => s + (item.packedQuantity || 0), 0),
                                0
                            );
                            return (
                                <Link
                                    key={event.id}
                                    href={`/pc/receive/${event.id}`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-500"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-slate-900">{event.name}</h3>
                                                <span className="text-xs font-mono text-slate-400">{event.code}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4" />
                                                    {event.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM")}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Package className="h-4 w-4" />
                                                    {totalItems} ชิ้น
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                                                <Truck className="mr-1 h-3 w-3" />
                                                ส่งมาแล้ว
                                            </span>
                                            <ArrowRight className="h-5 w-5 text-slate-400" />
                                        </div>
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

