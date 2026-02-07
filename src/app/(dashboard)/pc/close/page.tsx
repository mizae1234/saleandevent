import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, ArrowRight, Calendar, TrendingUp, Store } from "lucide-react";
import Link from "next/link";

async function getActiveEventsForClose() {
    const events = await db.event.findMany({
        where: {
            status: 'active'
        },
        include: {
            stock: true,
            sales: {
                include: {
                    items: true
                }
            }
        },
        orderBy: { endDate: 'asc' }
    });

    // Calculate sold quantities per event
    return events.map(event => {
        const totalStock = event.stock.reduce((sum, s) => sum + s.quantity, 0);
        const soldQuantity = event.sales.reduce((sum, sale) =>
            sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
        const totalSales = event.sales.reduce((sum, sale) =>
            sum + Number(sale.totalAmount), 0
        );

        return {
            ...event,
            totalStock,
            soldQuantity,
            remainingStock: totalStock - soldQuantity,
            totalSales
        };
    });
}

export default async function CloseEventListPage() {
    const events = await getActiveEventsForClose();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">ปิดยอด/ส่งคืน</h1>
                <p className="text-slate-500">เลือก Event ที่ต้องการปิดยอดและส่งคืนสินค้า</p>
            </div>

            {/* Active Events */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Store className="h-5 w-5 text-emerald-500" />
                    Event ที่กำลังขาย ({events.length})
                </h2>

                {events.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มี Event ที่พร้อมปิดยอด</p>
                        <p className="text-sm text-slate-400 mt-1">Event ต้องอยู่ในสถานะ Active จึงปิดยอดได้</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/pc/close/${event.id}`}
                                className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
                            >
                                {/* Event Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{event.name}</h3>
                                        <p className="text-xs text-slate-400 font-mono">{event.code}</p>
                                    </div>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                        Active
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
                                        {format(new Date(event.startDate), "d MMM", { locale: th })} - {format(new Date(event.endDate), "d MMM yyyy", { locale: th })}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <p className="text-xs text-blue-600 mb-1">ขายแล้ว</p>
                                        <p className="text-lg font-bold text-blue-700">{event.soldQuantity} <span className="text-sm font-normal">/ {event.totalStock}</span></p>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 p-3">
                                        <p className="text-xs text-emerald-600 mb-1">ยอดขาย</p>
                                        <p className="text-lg font-bold text-emerald-700">฿{event.totalSales.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Remaining Stock Progress */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                        <span>คงเหลือ</span>
                                        <span className="font-medium text-amber-600">{event.remainingStock} ชิ้น</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full"
                                            style={{ width: `${(event.remainingStock / event.totalStock) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="flex items-center justify-end gap-2 text-indigo-600 font-medium text-sm">
                                    ปิดยอด
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
