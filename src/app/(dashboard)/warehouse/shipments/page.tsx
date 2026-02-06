import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Truck, Calendar, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { ShipmentsFilter } from "./ShipmentsFilter";

interface SearchParams {
    search?: string;
    eventId?: string;
    dateFrom?: string;
    dateTo?: string;
}

async function getShipments(params: SearchParams) {
    const { search, eventId, dateFrom, dateTo } = params;

    // Build where clause for refill requests (StockRequest)
    const refillWhere: any = {
        status: { in: ['shipped', 'received'] }
    };

    if (eventId) {
        refillWhere.eventId = eventId;
    }

    if (dateFrom || dateTo) {
        refillWhere.shippedAt = {};
        if (dateFrom) {
            refillWhere.shippedAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            refillWhere.shippedAt.lte = toDate;
        }
    }

    if (search) {
        refillWhere.OR = [
            { trackingNo: { contains: search, mode: 'insensitive' } },
            { event: { location: { contains: search, mode: 'insensitive' } } },
            { event: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    // Get refill shipments
    const refillShipments = await db.stockRequest.findMany({
        where: refillWhere,
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
        orderBy: { shippedAt: 'desc' }
    });

    // Build where clause for DeliveryNotes (event shipments)
    const deliveryWhere: any = {
        status: { in: ['dispatched', 'delivered'] }
    };

    if (eventId) {
        deliveryWhere.eventId = eventId;
    }

    if (dateFrom || dateTo) {
        deliveryWhere.dispatchedAt = {};
        if (dateFrom) {
            deliveryWhere.dispatchedAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            deliveryWhere.dispatchedAt.lte = toDate;
        }
    }

    if (search) {
        deliveryWhere.OR = [
            { deliveryNoteNumber: { contains: search, mode: 'insensitive' } },
            { event: { location: { contains: search, mode: 'insensitive' } } },
            { event: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }

    // Get event shipments via DeliveryNotes
    const eventShipments = await db.deliveryNote.findMany({
        where: deliveryWhere,
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                }
            }
        },
        orderBy: { dispatchedAt: 'desc' }
    });

    return { refillShipments, eventShipments };
}

async function getEventsForFilter() {
    const events = await db.event.findMany({
        select: {
            id: true,
            name: true,
            code: true,
        },
        orderBy: { startDate: 'desc' }
    });
    return events;
}

interface Props {
    searchParams: Promise<SearchParams>;
}

export default async function ShipmentsPage({ searchParams }: Props) {
    const params = await searchParams;
    const [{ refillShipments, eventShipments }, eventsForFilter] = await Promise.all([
        getShipments(params),
        getEventsForFilter()
    ]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">ประวัติการจัดส่ง</h1>
                <p className="text-slate-500">ค้นหาและดูประวัติการจัดส่งสินค้าทั้งหมด</p>
            </div>

            {/* Filters */}
            <ShipmentsFilter events={eventsForFilter} />

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                            <Send className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Event ที่จัดส่ง</p>
                            <p className="text-xl font-bold text-slate-900">{eventShipments.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <RefreshCw className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">เบิกเพิ่มที่จัดส่ง</p>
                            <p className="text-xl font-bold text-slate-900">{refillShipments.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Truck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">รวมทั้งหมด</p>
                            <p className="text-xl font-bold text-slate-900">{eventShipments.length + refillShipments.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Shipments (DeliveryNotes) */}
            {eventShipments.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Send className="h-5 w-5 text-purple-500" />
                        Event ({eventShipments.length})
                    </h2>

                    <div className="space-y-3">
                        {eventShipments.map((delivery) => (
                            <Link
                                key={delivery.id}
                                href={`/events/${delivery.event.id}`}
                                className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple-500"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900">{delivery.event.name}</h3>
                                            <span className="text-xs font-mono text-slate-400">{delivery.event.code}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-4 w-4" />
                                                {delivery.event.location}
                                            </span>
                                            {delivery.dispatchedAt && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(delivery.dispatchedAt), 'd MMM yyyy HH:mm', { locale: th })}
                                                </span>
                                            )}
                                            <span className="text-xs font-mono text-purple-600">
                                                #{delivery.deliveryNoteNumber}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${delivery.status === 'delivered'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {delivery.status === 'delivered' ? 'ส่งถึงแล้ว' : 'กำลังส่ง'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Refill Shipments */}
            {refillShipments.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-blue-500" />
                        เบิกเพิ่ม ({refillShipments.length})
                    </h2>

                    <div className="space-y-3">
                        {refillShipments.map((request) => {
                            const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
                            return (
                                <div
                                    key={request.id}
                                    className="rounded-xl bg-white p-5 shadow-sm border-l-4 border-blue-400"
                                >
                                    <div className="flex items-center justify-between mb-3">
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
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(request.shippedAt), 'd MMM yyyy HH:mm', { locale: th })}
                                                    </span>
                                                )}
                                                {request.shipmentProvider && (
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                        {request.shipmentProvider}
                                                    </span>
                                                )}
                                                {request.trackingNo && (
                                                    <span className="text-xs font-mono text-blue-600">
                                                        #{request.trackingNo}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${request.status === 'received'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            <Truck className="mr-1 h-3 w-3" />
                                            {request.status === 'received' ? 'รับแล้ว' : 'ส่งแล้ว'}
                                        </span>
                                    </div>
                                    {/* Items List */}
                                    <div className="border-t border-slate-100 pt-3 mt-2">
                                        <p className="text-xs text-slate-500 mb-2 font-medium">รายการที่ส่ง:</p>
                                        <div className="grid gap-1">
                                            {request.items.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">{item.product.name}</span>
                                                    <span className="font-medium text-blue-600">{item.quantity} ชิ้น</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Empty State */}
            {eventShipments.length === 0 && refillShipments.length === 0 && (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                    <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ไม่พบรายการจัดส่ง</p>
                    <p className="text-xs text-slate-400 mt-1">ลองปรับเงื่อนไขการค้นหา</p>
                </div>
            )}
        </div>
    );
}
