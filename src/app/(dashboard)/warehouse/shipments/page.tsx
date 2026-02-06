import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Truck, Calendar, ArrowRight, RefreshCw, Send, History } from "lucide-react";
import Link from "next/link";
import { ShipmentsFilter } from "./ShipmentsFilter";

interface SearchParams {
    search?: string;
    eventId?: string;
    dateFrom?: string;
    dateTo?: string;
}

// Get events ready to ship (packed status)
async function getReadyToShipEvents() {
    const events = await db.event.findMany({
        where: {
            status: 'packed'
        },
        include: {
            stock: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { startDate: 'asc' }
    });
    return events;
}

// Get events in transit (shipped status)
async function getInTransitEvents() {
    const events = await db.event.findMany({
        where: {
            status: 'shipped'
        },
        include: {
            stock: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { startDate: 'asc' }
    });
    return events;
}

// Get refill requests ready to ship (packed status)
async function getReadyToShipRefills() {
    const requests = await db.stockRequest.findMany({
        where: {
            status: 'packed'
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
            items: true
        },
        orderBy: { createdAt: 'asc' }
    });
    return requests;
}

// Get shipping history (all shipped/received/delivered)
async function getShippingHistory(params: SearchParams) {
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
            items: true
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

export default async function WarehouseShipmentsPage({ searchParams }: Props) {
    const params = await searchParams;
    const [readyToShipEvents, inTransitEvents, readyToShipRefills, { refillShipments, eventShipments }, eventsForFilter] = await Promise.all([
        getReadyToShipEvents(),
        getInTransitEvents(),
        getReadyToShipRefills(),
        getShippingHistory(params),
        getEventsForFilter()
    ]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รายการจัดส่ง</h1>
                <p className="text-slate-500">จัดการและติดตามการจัดส่งสินค้าไปยัง Event</p>
            </div>

            {/* Ready to Ship - Events */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    พร้อมจัดส่ง ({readyToShipEvents.length + readyToShipRefills.length})
                </h2>

                {readyToShipEvents.length === 0 && readyToShipRefills.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มีรายการรอจัดส่ง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Events ready to ship */}
                        {readyToShipEvents.map((event) => {
                            const totalItems = event.stock.reduce((sum, s) => sum + (s.packedQuantity || 0), 0);
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}/shipping`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-500"
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
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                                                พร้อมจัดส่ง
                                            </span>
                                            <ArrowRight className="h-5 w-5 text-slate-400" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}

                        {/* Refills ready to ship */}
                        {readyToShipRefills.map((request) => {
                            const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
                            return (
                                <Link
                                    key={request.id}
                                    href={`/warehouse/refill/${request.id}/shipping`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border-l-4 border-orange-400"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
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
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-orange-100 text-orange-800">
                                                พร้อมจัดส่ง
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

            {/* In Transit / Shipped */}
            {inTransitEvents.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        กำลังจัดส่ง ({inTransitEvents.length})
                    </h2>

                    <div className="space-y-3">
                        {inTransitEvents.map((event) => {
                            const totalItems = event.stock.reduce((sum, s) => sum + (s.packedQuantity || 0), 0);
                            return (
                                <Link
                                    key={event.id}
                                    href={`/events/${event.id}`}
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
                                                    <Package className="h-4 w-4" />
                                                    {totalItems} ชิ้น
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                                                <Truck className="mr-1 h-3 w-3" />
                                                กำลังจัดส่ง
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

            {/* ==================== SHIPPING HISTORY ==================== */}
            <section className="border-t border-slate-200 pt-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-500" />
                    ประวัติการจัดส่ง
                </h2>

                {/* Filters */}
                <ShipmentsFilter events={eventsForFilter} />

                {/* History List */}
                <div className="mt-4 space-y-3">
                    {/* Event Shipments */}
                    {eventShipments.map((delivery) => (
                        <Link
                            key={delivery.id}
                            href={`/events/${delivery.event.id}`}
                            className="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-emerald-400"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                            <Send className="h-3 w-3" />
                                            Event
                                        </span>
                                        <h3 className="font-medium text-slate-900">{delivery.event.name}</h3>
                                        <span className="text-xs font-mono text-slate-400">{delivery.event.code}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {delivery.event.location}
                                        </span>
                                        {delivery.dispatchedAt && (
                                            <span className="text-xs text-slate-400">
                                                {format(new Date(delivery.dispatchedAt), 'd MMM yyyy HH:mm', { locale: th })}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono text-emerald-600">
                                            #{delivery.deliveryNoteNumber}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${delivery.status === 'delivered'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {delivery.status === 'delivered' ? 'ส่งถึงแล้ว' : 'กำลังส่ง'}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Refill Shipments */}
                    {refillShipments.map((request) => {
                        const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
                        return (
                            <Link
                                key={request.id}
                                href={`/events/${request.event.id}`}
                                className="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-400"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                                <RefreshCw className="h-3 w-3" />
                                                เบิกเพิ่ม
                                            </span>
                                            <h3 className="font-medium text-slate-900">{request.event.name}</h3>
                                            <span className="text-xs font-mono text-slate-400">{request.event.code}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {request.event.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                {request.items.length} รายการ ({totalItems} ชิ้น)
                                            </span>
                                            {request.shippedAt && (
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(request.shippedAt), 'd MMM yyyy HH:mm', { locale: th })}
                                                </span>
                                            )}
                                            {request.trackingNo && (
                                                <span className="text-xs font-mono text-blue-600">
                                                    #{request.trackingNo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${request.status === 'received'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {request.status === 'received' ? 'รับแล้ว' : 'ส่งแล้ว'}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {/* Empty State */}
                    {eventShipments.length === 0 && refillShipments.length === 0 && (
                        <div className="rounded-xl bg-slate-50 p-8 text-center">
                            <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">ไม่พบประวัติการจัดส่ง</p>
                            <p className="text-xs text-slate-400 mt-1">ลองปรับเงื่อนไขการค้นหา</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
