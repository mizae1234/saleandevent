import { db } from "@/lib/db";
import { format } from "date-fns";
import { Package, MapPin, Calendar, ArrowRight, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";

async function getActiveEvents() {
    const events = await db.event.findMany({
        where: {
            status: 'active'
        },
        include: {
            stock: true
        },
        orderBy: { startDate: 'asc' }
    });
    return events;
}

export default async function POSSelectPage() {
    const events = await getActiveEvents();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">ขายสินค้า (POS)</h1>
                <p className="text-slate-500">เลือก Event หรือสาขาที่ต้องการบันทึกการขาย</p>
            </div>

            {/* Active Events */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    Event ที่กำลังขาย ({events.length})
                </h2>

                {events.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <Store className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มี Event ที่พร้อมขาย</p>
                        <p className="text-sm text-slate-400 mt-1">Event ต้องอยู่ในสถานะ &quot;active&quot; จึงจะขายได้</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => {
                            const totalStock = event.stock.reduce((sum, s) => sum + s.quantity, 0);
                            const totalSold = event.stock.reduce((sum, s) => sum + (s.soldQuantity || 0), 0);

                            return (
                                <Link
                                    key={event.id}
                                    href={`/pc/pos/event/${event.id}`}
                                    className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-emerald-500 hover:scale-[1.02]"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{event.name}</h3>
                                            <span className="text-xs font-mono text-slate-400">{event.code}</span>
                                        </div>
                                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800">
                                            <ShoppingCart className="mr-1 h-3 w-3" />
                                            พร้อมขาย
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-500 mb-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stock Progress */}
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500">ขายแล้ว</span>
                                            <span className="font-medium text-slate-700">{totalSold} / {totalStock}</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all"
                                                style={{ width: `${totalStock > 0 ? (totalSold / totalStock) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-end text-emerald-600 font-medium text-sm">
                                        ขาย
                                        <ArrowRight className="ml-1 h-4 w-4" />
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
