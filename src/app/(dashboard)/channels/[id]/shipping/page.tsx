import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";
import ShippingForm from "./ShippingForm";

export default async function ShippingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // id here is the stock request ID
    const request = await db.stockRequest.findUnique({
        where: { id },
        include: {
            channel: true,
            allocations: true,
        },
    });

    if (!request || request.status !== 'packed') {
        notFound();
    }

    const packedTotal = request.allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <Link href="/warehouse/shipments" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" /> จัดส่ง — {request.channel.name}
                </h1>
                <p className="text-sm text-slate-500">{request.channel.code}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <ShippingForm requestId={request.id} packedTotal={packedTotal} />
            </div>
        </div>
    );
}
