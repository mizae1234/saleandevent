import { db } from "@/lib/db";
import { fmt } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { MapPin, Calendar, ArrowRight, ShoppingCart, Store, Package, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

async function getActiveEvents() {
    const events = await db.salesChannel.findMany({
        where: { status: 'active' },
        include: {
            stock: { select: { quantity: true, soldQuantity: true } },
            _count: { select: { sales: true } },
        },
        orderBy: { startDate: 'asc' },
    });

    const salesAggs = await db.sale.groupBy({
        by: ['channelId'],
        where: {
            channelId: { in: events.map(e => e.id) },
            status: 'active',
        },
        _sum: { totalAmount: true },
    });
    const salesMap = new Map(salesAggs.map(a => [a.channelId, Number(a._sum.totalAmount || 0)]));

    return events.map(event => {
        const totalStock = event.stock.reduce((sum, s) => sum + s.quantity, 0);
        const totalSold = event.stock.reduce((sum, s) => sum + (s.soldQuantity || 0), 0);
        return {
            ...event,
            totalStock,
            totalSold,
            remainingStock: totalStock - totalSold,
            totalSales: salesMap.get(event.id) || 0,
            salesCount: event._count.sales,
        };
    });
}

export default async function POSSelectPage() {
    const events = await getActiveEvents();

    const totalAllSales = events.reduce((s, e) => s + e.totalSales, 0);
    const totalAllSold = events.reduce((s, e) => s + e.totalSold, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={ShoppingCart}
                title="ขายสินค้า (POS)"
                subtitle="เลือก Event หรือสาขาที่ต้องการบันทึกการขาย"
            />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ช่องทางขาย</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{events.length}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-emerald-400/20">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ยอดขายรวม</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">฿{fmt(totalAllSales)}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-teal-400/20">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ขายแล้ว</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{fmt(totalAllSold)}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">ชิ้น</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-blue-400/20">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>
            </div>

            {/* Event List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Event ที่กำลังขาย
                        <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{events.length}</span>
                    </h2>
                </div>

                {events.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Store}
                            message="ไม่มี Event ที่พร้อมขาย"
                            description='Event ต้องอยู่ในสถานะ "active" จึงจะขายได้'
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {events.map((event) => {
                            const soldPct = event.totalStock > 0 ? Math.round((event.totalSold / event.totalStock) * 100) : 0;

                            return (
                                <Link
                                    key={event.id}
                                    href={`/pc/pos/channel/${event.id}`}
                                    className="block p-4 sm:p-5 hover:bg-emerald-50/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        {/* Icon */}
                                        <div className="hidden sm:flex flex-shrink-0 h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
                                            <ShoppingCart className="h-6 w-6 text-white" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                                                    {event.name}
                                                </h3>
                                                <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                    {event.code}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {event.location}
                                                </span>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(event.startDate!), "d MMM", { locale: th })} – {format(new Date(event.endDate!), "d MMM", { locale: th })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Sales info */}
                                        <div className="flex-shrink-0 text-right hidden sm:block">
                                            <p className="text-sm font-bold text-emerald-600">฿{fmt(event.totalSales)}</p>
                                            <p className="text-[11px] text-slate-400">{event.salesCount} บิล</p>
                                        </div>

                                        <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 sm:ml-16">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="text-slate-400">
                                                ขายแล้ว <span className="font-semibold text-slate-600">{fmt(event.totalSold)}</span> / {fmt(event.totalStock)} ชิ้น
                                            </span>
                                            <span className="font-semibold text-emerald-600">{soldPct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                                                style={{ width: `${soldPct}%` }}
                                            />
                                        </div>
                                        {/* Mobile sales */}
                                        <div className="mt-2 flex items-center justify-between sm:hidden">
                                            <span className="text-xs text-slate-400">{event.salesCount} บิล</span>
                                            <span className="text-sm font-bold text-emerald-600">฿{fmt(event.totalSales)}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
