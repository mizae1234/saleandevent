import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";
import { POSInterface } from "@/app/(admin)/pc/pos/channel/[id]/POSInterface";

export default async function EmployeePOSSellPage({ params }: { params: Promise<{ id: string }> }) {
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
                            name: true,
                            code: true,
                            size: true,
                            color: true,
                            producttype: true,
                            price: true,
                            barcode: true,
                        }
                    }
                }
            },
        }
    });

    if (!event || !['active', 'approved', 'payment_approved'].includes(event.status)) notFound();

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
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden -mb-6">
            {/* Compact Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                <Link
                    href={`/channel/${channelId}/pos`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-emerald-600" />
                        <h1 className="text-base font-bold text-slate-900 truncate">{event.name}</h1>
                    </div>
                    <p className="text-xs text-slate-400">{event.code} · POS</p>
                </div>
            </div>

            <POSInterface
                channelId={event.id}
                eventName={event.name}
                stockItems={stockItems}
            />
        </div>
    );
}
