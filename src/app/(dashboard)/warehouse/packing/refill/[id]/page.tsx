import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { RefillPackingClient } from "./RefillPackingClient";

interface Props {
    params: Promise<{ id: string }>;
}

async function getRefillRequest(id: string) {
    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            event: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                }
            },
            items: {
                include: {
                    product: {
                        select: {
                            barcode: true,
                            name: true,
                            code: true,
                            size: true,
                        }
                    }
                }
            }
        }
    });
    return request;
}

export default async function RefillPackingDetailPage({ params }: Props) {
    const { id } = await params;
    const request = await getRefillRequest(id);

    if (!request) {
        notFound();
    }

    return <RefillPackingClient request={request} />;
}
