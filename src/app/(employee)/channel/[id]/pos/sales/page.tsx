import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventSalesClient } from "@/app/(admin)/pc/sales/channel/[id]/EventSalesClient";

export default async function EmployeeSalesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const event = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            stock: {
                select: {
                    quantity: true,
                    soldQuantity: true,
                    returnedQuantity: true,
                }
            },
            sales: {
                include: {
                    items: {
                        include: {
                            product: {
                                select: { name: true, code: true, size: true, color: true, price: true }
                            }
                        }
                    }
                },
                orderBy: { soldAt: 'desc' }
            }
        }
    });

    if (!event) notFound();

    const totalSent = event.stock.reduce((s, i) => s + i.quantity, 0);
    const totalSold = event.stock.reduce((s, i) => s + i.soldQuantity, 0);
    const totalReturned = event.stock.reduce((s, i) => s + i.returnedQuantity, 0);
    const totalRemaining = totalSent - totalSold - totalReturned;

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
                    <h1 className="text-base font-bold text-slate-900">รายการขาย</h1>
                    <p className="text-xs text-slate-400">{event.name} — {event.code}</p>
                </div>
            </div>

            <EventSalesClient
                event={{
                    id: event.id,
                    name: event.name,
                    code: event.code,
                    location: event.location || '',
                    isCashBooth: event.isCashBooth,
                    stock: totalSent,
                    sold: totalSold,
                    remaining: totalRemaining
                }}
                sales={event.sales.map(s => ({
                    id: s.id,
                    billCode: s.billCode,
                    totalAmount: Number(s.totalAmount),
                    discount: Number(s.discount),
                    paymentMethod: s.paymentMethod,
                    receivedAmount: s.receivedAmount ? Number(s.receivedAmount) : null,
                    changeAmount: s.changeAmount ? Number(s.changeAmount) : null,
                    status: s.status,
                    soldAt: s.soldAt.toISOString(),
                    items: s.items.map(i => ({
                        id: i.id,
                        barcode: i.barcode,
                        quantity: i.quantity,
                        unitPrice: Number(i.unitPrice),
                        totalAmount: Number(i.totalAmount),
                        isFreebie: i.isFreebie,
                        product: {
                            name: i.product.name,
                            code: i.product.code,
                            size: i.product.size,
                            color: i.product.color,
                            price: i.product.price ? Number(i.product.price) : null
                        }
                    }))
                }))}
                backHref={`/channel/${channelId}/pos`}
            />
        </div>
    );
}
