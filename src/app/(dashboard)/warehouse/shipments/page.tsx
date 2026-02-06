import { db } from "@/lib/db";
import { format } from "date-fns";
import { Truck, MapPin, Calendar, Package, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

async function getShippingEvents() {
    const events = await db.event.findMany({
        where: {
            status: { in: ['packed', 'shipped'] }
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

export default async function WarehouseShipmentsPage() {
    const events = await getShippingEvents();

    const readyToShip = events.filter(e => e.status === 'packed');
    const inTransit = events.filter(e => e.status === 'shipped');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รายการจัดส่ง</h1>
                <p className="text-slate-500">จัดการและติดตามการจัดส่งสินค้าไปยัง Event</p>
            </div>

            {/* Ready to Ship */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    พร้อมจัดส่ง ({readyToShip.length})
                </h2>

                {readyToShip.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มีรายการรอจัดส่ง</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {readyToShip.map((event) => {
                            const totalItems = event.requests.reduce(
                                (sum, req) => sum + req.items.reduce((s, item) => s + item.quantity, 0),
                                0
                            );
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
                    </div>
                )}
            </section>

            {/* In Transit / Shipped */}
            {inTransit.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        กำลังจัดส่ง ({inTransit.length})
                    </h2>

                    <div className="space-y-3">
                        {inTransit.map((event) => {
                            const totalItems = event.requests.reduce(
                                (sum, req) => sum + req.items.reduce((s, item) => s + item.quantity, 0),
                                0
                            );
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
        </div>
    );
}
