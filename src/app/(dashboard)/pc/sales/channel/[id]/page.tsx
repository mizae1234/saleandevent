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
            sales: {
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    code: true
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

    return (
        <EventSalesClient
            event={{
                id: event.id,
                name: event.name,
                code: event.code,
                location: event.location || ''
            }}
            sales={event.sales as any}
        />
    );
}
