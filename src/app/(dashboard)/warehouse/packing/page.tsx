import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Calendar, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

async function getPackingEvents() {
    const events = await db.event.findMany({
        where: {
            status: { in: ['packing', 'packed'] }
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

async function getApprovedRefillRequests() {
    const requests = await db.stockRequest.findMany({
        where: {
            status: 'approved'
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
        orderBy: { approvedAt: 'asc' }
    });
    return requests;
}

export default async function WarehousePackingPage() {
    const [events, refillRequests] = await Promise.all([
        getPackingEvents(),
        getApprovedRefillRequests()
    ]);

    const packingEvents = events.filter(e => e.status === 'packing');
    const packedEvents = events.filter(e => e.status === 'packed');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">งานรอแพ็ค</h1>
                <p className="text-slate-500">รายการ Event และคำขอเบิกเพิ่มที่รอการจัดเตรียมสินค้าจากคลัง</p>
            </div>

            {/* Refill Requests Section */}
            {refillRequests.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        คำขอเบิกเพิ่ม ({refillRequests.length})
                    </h2>

                    <div className="space-y-3">
                        {refillRequests.map((request) => {
                            const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
                            return (
                                <Link
                                    key={request.id}
                                    href={`/warehouse/packing/refill/${request.id}`}
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
                                                <span className="text-xs text-slate-400">
                                                    อนุมัติ: {format(new Date(request.approvedAt!), 'd MMM', { locale: th })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                                                รอแพค
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

            {/* Packing Queue */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    Event รอแพค ({packingEvents.length})
                </h2>

                {packingEvents.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มี Event รอแพค</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {packingEvents.map((event) => {
                            const totalItems = event.requests.reduce(
                                (sum, req) => sum + req.items.reduce((s, item) => s + item.quantity, 0),
                                0
                            );
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}/packing`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
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
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800">
                                                รอแพค
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

            {/* Packed Events (Ready to Ship) */}
            {packedEvents.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        แพคเสร็จแล้ว - รอจัดส่ง ({packedEvents.length})
                    </h2>

                    <div className="space-y-3">
                        {packedEvents.map((event) => {
                            const totalItems = event.requests.reduce(
                                (sum, req) => sum + req.items.reduce((s, item) => s + item.quantity, 0),
                                0
                            );
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}/shipping`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-500"
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
                                                    <Package className="h-4 w-4" />
                                                    {totalItems} ชิ้น
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-800">
                                                พร้อมจัดส่ง
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
        </div>
    );
}

