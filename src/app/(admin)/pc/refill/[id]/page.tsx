import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { RefillDetailClient } from "./RefillDetailClient";

export default async function RefillDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: {
                include: { product: { select: { name: true, code: true, color: true, size: true } } },
            },
        },
    });

    if (!request) notFound();

    return <RefillDetailClient request={JSON.parse(JSON.stringify(request))} />;
}
