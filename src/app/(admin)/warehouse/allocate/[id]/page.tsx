import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import AllocationUpload from "./AllocationUpload";

export default async function AllocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: { include: { product: true } },
        },
    });

    if (!request || !['approved', 'allocated'].includes(request.status)) {
        notFound();
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <Link href="/warehouse/packing" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" /> จัดสรรสินค้า
                </h1>
                <p className="text-sm text-slate-500">{request.channel.name} ({request.channel.code}) · {request.requestType}</p>
            </div>

            <AllocationUpload
                requestId={request.id}
                channelName={request.channel.name}
                requestedTotal={request.requestedTotalQuantity}
            />
        </div>
    );
}
