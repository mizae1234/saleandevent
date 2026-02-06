import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Receipt, Calendar, ChevronRight, History, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ id: string }>;
}

async function getEventWithSales(eventId: string) {
    const event = await db.event.findUnique({
        where: { id: eventId },
        include: {
            sales: {
                where: { status: 'active' },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { soldAt: 'desc' }
            }
        }
    });
    return event;
}

export default async function EventSalesPage({ params }: Props) {
    const { id } = await params;
    const event = await getEventWithSales(id);

    if (!event) {
        notFound();
    }

    // Group sales by date
    const groupedSales = event.sales.reduce((acc, sale) => {
        const dateKey = format(new Date(sale.soldAt), "yyyy-MM-dd");
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(sale);
        return acc;
    }, {} as Record<string, typeof event.sales>);

    const totalSales = event.sales.reduce(
        (sum, s) => sum + parseFloat(s.totalAmount.toString()),
        0
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/sales"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
                    <p className="text-slate-500 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {event.location} • {event.sales.length} บิล • ฿{totalSales.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Sales List */}
            {event.sales.length === 0 ? (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ยังไม่มีรายการขาย</p>
                    <Link
                        href={`/pc/pos/event/${event.id}`}
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                        <Receipt className="h-4 w-4" />
                        เริ่มขายสินค้า
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedSales).map(([dateKey, daySales]) => (
                        <section key={dateKey}>
                            <h2 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: th })}
                                <span className="text-emerald-600">
                                    ({daySales.length} บิล • ฿{daySales.reduce((s, sale) => s + parseFloat(sale.totalAmount.toString()), 0).toLocaleString()})
                                </span>
                            </h2>

                            <div className="space-y-2">
                                {daySales.map(sale => (
                                    <Link
                                        key={sale.id}
                                        href={`/pc/sales/${sale.id}`}
                                        className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                                    <Receipt className="h-5 w-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                            ฿{parseFloat(sale.totalAmount.toString()).toLocaleString()}
                                                        </span>
                                                        {sale.discount && parseFloat(sale.discount.toString()) > 0 && (
                                                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">
                                                                -฿{parseFloat(sale.discount.toString()).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {format(new Date(sale.soldAt), "HH:mm น.")}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm text-slate-500">{sale.items.length} รายการ</p>
                                                    <p className="text-xs text-slate-400">
                                                        {sale.items.slice(0, 2).map(i => i.product.name).join(', ')}
                                                        {sale.items.length > 2 && '...'}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            {event.sales.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">บิลทั้งหมด</p>
                        <p className="text-2xl font-bold text-slate-900">{event.sales.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">ยอดรวม</p>
                        <p className="text-2xl font-bold text-emerald-600">
                            ฿{totalSales.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <p className="text-sm text-slate-500">สินค้าขายได้</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {event.sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0)} ชิ้น
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
