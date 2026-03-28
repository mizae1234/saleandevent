import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import NewRefillClient from "@/app/(admin)/pc/refill/new/NewRefillClient";

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            items: { include: { product: true } },
        },
    });

    if (!request || !['approved', 'allocated'].includes(request.status)) {
        notFound();
    }

    const channels = await db.salesChannel.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
    });

    const initialCart = request.items.map(item => ({
        barcode: item.barcode,
        code: item.product.code,
        name: item.product.name,
        size: item.product.size,
        color: item.product.color,
        price: Number(item.product.price) || 0,
        category: item.product.category,
        quantity: item.quantity,
        notes: item.notes || undefined
    }));

    return (
        <NewRefillClient 
            channels={channels.map(ch => ({
                id: ch.id,
                name: ch.name,
                code: ch.code,
            }))}
            isAdminEdit={true}
            initialCartItems={initialCart}
            requestId={request.id}
            preselectedChannelId={request.channelId}
            hideChannelSelect={true}
            backHref={`/warehouse/allocate/${request.id}`}
        />
    );
}
