import { db } from "@/lib/db";
import { format } from "date-fns";
import { Package, MapPin, Calendar, ArrowRight, PackageCheck, Truck } from "lucide-react";
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

export default async function ReceiveGoodsPage() {
    const events = await getShippedEvents();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รับสินค้าเข้า</h1>
                <p className="text-slate-500">รายการ Event ที่ส่งของมาแล้ว รอตรวจรับสินค้า</p>
            </div>

            {/* Events Ready to Receive */}
            <section>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    รอตรวจรับ ({events.length})
                </h2>

                {events.length === 0 ? (
                    <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                        <PackageCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">ไม่มีรายการรอตรวจรับ</p>
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
