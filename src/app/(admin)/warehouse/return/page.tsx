import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, ArrowRight, Calendar, Truck, Undo2 } from "lucide-react";
import Link from "next/link";

async function getReturningEvents() {
    const events = await db.salesChannel.findMany({
        where: {
            status: 'returning'
        },
        include: {
            returnSummaries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    items: true
                }
            }
        },
        orderBy: { updatedAt: 'asc' }
    });

    return events.map(event => {
        const returnSummary = event.returnSummaries[0];
        const totalReturn = returnSummary?.items.reduce((sum, item) => sum + item.remainingQuantity, 0) || 0;
        const itemCount = returnSummary?.items.length || 0;

        return {
            ...event,
            totalReturn,
            itemCount,
            returnSummary
        };
    });
}

export default async function WarehouseReturnPage() {
    const events = await getReturningEvents();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รับคืนสินค้า</h1>
                <p className="text-slate-500">รายการสินค้าที่กำลังส่งคืนจาก Event</p>
            </div>

            {/* Returning Events */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-amber-500" />
                    กำลังส่งคืน ({events.length})
                </h2>

                {events.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Undo2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มีสินค้าที่รอรับคืน</p>
                        <p className="text-sm text-slate-400 mt-1">เมื่อ PC ส่งคืนสินค้า จะแสดงที่นี่</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/warehouse/return/${event.id}`}
                                className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
                            >
                                {/* Event Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{event.name}</h3>
                                        <p className="text-xs text-slate-400 font-mono">{event.code}</p>
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                                        <Truck className="h-3 w-3" />
                                        กำลังส่ง
                                    </span>
                                </div>

                                {/* Event Info */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        {event.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        {format(new Date(event.startDate!), "d MMM", { locale: th })} - {format(new Date(event.endDate!), "d MMM yyyy", { locale: th })}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="rounded-lg bg-emerald-50 p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-emerald-600 mb-1">สินค้าที่ส่งคืน</p>
                                            <p className="text-2xl font-bold text-emerald-700">{event.totalReturn}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 mb-1">จำนวนรายการ</p>
                                            <p className="text-lg font-semibold text-slate-700">{event.itemCount}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="flex items-center justify-end gap-2 text-teal-600 font-medium text-sm">
                                    รับคืน
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
