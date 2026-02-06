import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { SaleDetailClient } from "./SaleDetailClient";

interface Props {
    params: Promise<{ id: string }>;
}

async function getSaleById(saleId: string) {
    const sale = await db.sale.findUnique({
        where: { id: saleId },
        include: {
            items: {
                include: {
                    product: true
                }
            },
            event: true
        }
    });
    return sale;
}

export default async function SaleDetailPage({ params }: Props) {
    const { id } = await params;
    const sale = await getSaleById(id);

    if (!sale) {
        notFound();
    }

    return <SaleDetailClient sale={sale as any} />;
}
