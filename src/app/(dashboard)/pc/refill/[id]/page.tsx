import { getRefillRequestById } from "@/actions/refill-actions";
import { notFound } from "next/navigation";
import { RefillDetailClient } from "./RefillDetailClient";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RefillDetailPage({ params }: Props) {
    const { id } = await params;
    const request = await getRefillRequestById(id);

    if (!request) {
        notFound();
    }

    return <RefillDetailClient request={request} />;
}
