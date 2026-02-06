import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Receipt, Calendar, MapPin, ChevronRight, History, ShoppingCart } from "lucide-react";
import Link from "next/link";

async function getActiveEventsWithSales() {
    const events = await db.event.findMany({
        where: {
            status: { in: ['selling', 'approved', 'packing', 'shipped', 'received'] }
        },
        include: {
            sales: {
                where: { status: 'active' },
                select: {
                    id: true,
                    totalAmount: true,
                    soldAt: true
                }
            }
        },
        orderBy: { startDate: 'desc' }
    });
    return events;
}

export default async function SalesEventSelectPage() {
    const events = await getActiveEventsWithSales();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รายการขาย</h1>
                <p className="text-slate-500">เลือก Event เพื่อดูรายการขาย</p>
            </div>

            {/* Events List */}
            {events.length === 0 ? (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ยังไม่มี Event ที่มีรายการขาย</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map(event => {
                        const totalSales = event.sales.reduce(
                            (sum, s) => sum + parseFloat(s.totalAmount.toString()),
                            0
                        );
                        const salesCount = event.sales.length;
                        const todaySales = event.sales.filter(s =>
                            format(new Date(s.soldAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ).length;

                        return (
                            <Link
                                key={event.id}
                                href={`/pc/sales/event/${event.id}`}
                                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                        <Receipt className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                            {event.name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {event.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(event.startDate), "d MMM yyyy", { locale: th })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-600">
                                            ฿{totalSales.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {salesCount} บิล
                                            {todaySales > 0 && (
                                                <span className="ml-2 text-emerald-600">
                                                    (+{todaySales} วันนี้)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {events.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">Event ทั้งหมด</p>
                        <p className="text-2xl font-bold text-slate-900">{events.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">ยอดขายรวม</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            ฿{events.reduce((sum, e) =>
                                sum + e.sales.reduce((s, sale) => s + parseFloat(sale.totalAmount.toString()), 0),
                                0
                            ).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">บิลทั้งหมด</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {events.reduce((sum, e) => sum + e.sales.length, 0)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
