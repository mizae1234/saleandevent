import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { EventSalesClient } from "./EventSalesClient";

interface Props {
    params: Promise<{ id: string }>;
}

async function getEventWithSales(channelId: string) {
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
                                select: {
                                    name: true,
                                    code: true,
                                    size: true,
                                    color: true,
                                    price: true
                                }
                            }
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

    const totalSent = event.stock.reduce((s, i) => s + i.quantity, 0);
    const totalSold = event.stock.reduce((s, i) => s + i.soldQuantity, 0);
    const totalReturned = event.stock.reduce((s, i) => s + i.returnedQuantity, 0);
    const totalRemaining = totalSent - totalSold - totalReturned;

    return (
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
        />
    );
}
