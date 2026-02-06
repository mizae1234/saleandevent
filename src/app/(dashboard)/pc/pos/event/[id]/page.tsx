import { db } from "@/lib/db";
import { ArrowLeft, Calendar, MapPin, Store } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POSInterface } from "./POSInterface";

async function getEventWithStock(eventId: string) {
    const event = await db.event.findUnique({
        where: { id: eventId },
        include: {
            stock: {
                include: {
                    product: true
                }
            },
            sales: {
                orderBy: { soldAt: 'desc' },
                take: 5,
                include: {
                    items: true
                }
            }
        }
    });
    return event;
}

export default async function POSEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventWithStock(id);

    if (!event || event.status !== 'active') {
        notFound();
    }

    // เตรียมข้อมูลสินค้าในสต็อก (เฉพาะ product เท่านั้น ไม่รวม equipment)
    const stockItems = event.stock
        .filter(stock => stock.product.producttype === 'product')
        .map(stock => ({
            barcode: stock.barcode,
            code: stock.product.code,
            productName: stock.product.name,
            size: stock.product.size,
            color: stock.product.color,
            price: parseFloat(stock.product.price?.toString() || '0'),
            quantity: stock.quantity,
            soldQuantity: stock.soldQuantity || 0,
            available: stock.quantity - (stock.soldQuantity || 0)
        }));

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
                <Link
                    href="/pc/pos"
                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-emerald-600" />
                        <h1 className="text-xl font-bold text-slate-900">{event.name}</h1>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{event.code}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM")}
                        </span>
                    </div>
                </div>
            </div>

            {/* POS Interface */}
            <POSInterface
                eventId={event.id}
                eventName={event.name}
                stockItems={stockItems}
            />
        </div>
    );
}
