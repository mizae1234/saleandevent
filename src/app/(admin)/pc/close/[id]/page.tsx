import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, MapPin, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CloseEventClient } from "./CloseEventClient";

async function getEventForClose(id: string) {
    const event = await db.salesChannel.findUnique({
        where: { id },
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
                include: {
                    items: true
                }
            }
        }
    });

    if (!event) return null;

    // Calculate sold quantities per product
    const soldByBarcode = new Map<string, number>();
    event.sales.forEach(sale => {
        sale.items.forEach(item => {
            const current = soldByBarcode.get(item.barcode) || 0;
            soldByBarcode.set(item.barcode, current + item.quantity);
        });
    });

    // Create detailed stock list with sold quantities
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

    return {
        id: event.id,
        name: event.name,
        code: event.code,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        status: event.status,
        stockDetails,
        totalSales,
        salesCount: event.sales.length
    };
}

interface Props {
    params: Promise<{ id: string }>;
}

export default async function CloseEventPage({ params }: Props) {
    const { id } = await params;
    const event = await getEventForClose(id);

    if (!event) {
        notFound();
    }

    if (event.status !== 'active') {
        return (
            <div className="space-y-6">
                <div className="rounded-xl bg-amber-50 p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-700 font-medium">Event นี้ไม่สามารถปิดยอดได้</p>
                    <p className="text-sm text-amber-600 mt-1">สถานะปัจจุบัน: {event.status}</p>
                    <Link
                        href="/pc/close"
                        className="inline-block mt-4 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    >
                        กลับหน้ารายการ
                    </Link>
                </div>
            </div>
        );
    }

    const totalReceived = event.stockDetails.reduce((sum, s) => sum + s.receivedQuantity, 0);
    const totalSold = event.stockDetails.reduce((sum, s) => sum + s.soldQuantity, 0);
    const totalRemaining = event.stockDetails.reduce((sum, s) => sum + s.remainingQuantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/close"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">ปิดยอด Event</h1>
                    <p className="text-slate-500">{event.name} ({event.code})</p>
                </div>
            </div>

            {/* Event Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูล Event</h3>
                <div className="grid gap-4 md:grid-cols-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <MapPin className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">สถานที่</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ระยะเวลา</p>
                            <p className="font-medium text-slate-900">
                                {format(new Date(event.startDate!), "d MMM", { locale: th })} - {format(new Date(event.endDate!), "d MMM", { locale: th })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ยอดขายรวม</p>
                            <p className="font-medium text-emerald-600">฿{event.totalSales.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ขายแล้ว / ทั้งหมด</p>
                            <p className="font-medium text-slate-900">{totalSold} / {totalReceived}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Close Form */}
            <CloseEventClient
                channelId={event.id}
                eventName={event.name}
                stockDetails={event.stockDetails}
            />
        </div>
    );
}
