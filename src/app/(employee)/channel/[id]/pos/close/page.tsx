import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, MapPin, Calendar, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { CloseEventClient } from "@/app/(admin)/pc/close/[id]/CloseEventClient";

export default async function EmployeeClosePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const event = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            stock: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                            color: true,
                            producttype: true,
                            price: true,
                        }
                    }
                }
            },
            sales: {
                where: { status: 'active' },
                include: { items: true }
            }
        }
    });

    if (!event) notFound();

    if (event.status !== 'active') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/channel/${channelId}/pos`}
                        className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Link>
                    <h1 className="text-base font-bold text-slate-900">ปิดยอด/ส่งคืน</h1>
                </div>
                <div className="rounded-2xl bg-amber-50 p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                    <p className="text-amber-700 font-medium">Event นี้ไม่สามารถปิดยอดได้</p>
                    <p className="text-sm text-amber-600 mt-1">สถานะปัจจุบัน: {event.status}</p>
                </div>
            </div>
        );
    }

    // Build stock details
    const soldByBarcode = new Map<string, number>();
    event.sales.forEach(sale => {
        sale.items.forEach(item => {
            const current = soldByBarcode.get(item.barcode) || 0;
            soldByBarcode.set(item.barcode, current + item.quantity);
        });
    });

    const stockDetails = event.stock.map(s => ({
        barcode: s.barcode,
        productName: s.product.name,
        productCode: s.product.code,
        size: s.product.size,
        color: s.product.color,
        producttype: s.product.producttype,
        price: Number(s.product.price || 0),
        receivedQuantity: s.quantity,
        soldQuantity: soldByBarcode.get(s.barcode) || 0,
        remainingQuantity: s.quantity - (soldByBarcode.get(s.barcode) || 0)
    }));

    const totalSales = event.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalReceived = stockDetails.reduce((s, d) => s + d.receivedQuantity, 0);
    const totalSold = stockDetails.reduce((s, d) => s + d.soldQuantity, 0);

    return (
        <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}/pos`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-base font-bold text-slate-900">ปิดยอด/ส่งคืน</h1>
                    <p className="text-xs text-slate-400">{event.name} — {event.code}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                        <p className="text-xs text-emerald-600 font-medium">ยอดขาย</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">฿{totalSales.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-blue-600 font-medium">ขายแล้ว</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{totalSold} <span className="text-sm font-normal text-blue-500">/ {totalReceived}</span></p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-500 font-medium">สถานที่</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700">{event.location}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <p className="text-xs text-slate-500 font-medium">ระยะเวลา</p>
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                        {event.startDate && format(new Date(event.startDate), "d MMM", { locale: th })} - {event.endDate && format(new Date(event.endDate), "d MMM", { locale: th })}
                    </p>
                </div>
            </div>

            {/* Close Form (reused from admin) */}
            <CloseEventClient
                channelId={event.id}
                eventName={event.name}
                stockDetails={stockDetails}
                redirectTo={`/channel/${channelId}/pos`}
            />
        </div>
    );
}
