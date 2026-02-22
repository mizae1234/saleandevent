import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck } from "lucide-react";
import ReceivingInterface from "@/app/(admin)/pc/receive/[id]/ReceivingInterface";

export default async function EmployeeReceivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    // Find shipped stock requests for this channel
    const requests = await db.stockRequest.findMany({
        where: {
            channelId,
            status: 'shipped',
        },
        include: {
            channel: true,
            shipment: true,
            allocations: { include: { product: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) notFound();

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
                    <h1 className="text-base font-bold text-slate-900">รับสินค้าเข้า</h1>
                    <p className="text-xs text-slate-400">{channel.name} — {requests.length} รายการรอรับ</p>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
                    <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-medium text-slate-500">ไม่มีสินค้ารอรับ</p>
                    <p className="text-xs text-slate-400 mt-1">สินค้าที่จัดส่งแล้วจะแสดงที่นี่</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => {
                        const totalPacked = req.allocations.reduce((s, a) => s + a.packedQuantity, 0);
                        return (
                            <div key={req.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                                {/* Request Header */}
                                <div className="p-4 border-b border-slate-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {req.requestType === 'INITIAL' ? 'สินค้าเริ่มต้น' : 'ของเพิ่ม'}
                                        </span>
                                        <span className="text-xs text-slate-400">{totalPacked} ชิ้น</span>
                                    </div>
                                    {req.shipment && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Truck className="h-3.5 w-3.5" />
                                            {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                        </div>
                                    )}
                                </div>

                                {/* Receiving Interface */}
                                <div className="p-4">
                                    <ReceivingInterface
                                        requestId={req.id}
                                        redirectTo={`/channel/${channelId}/pos/receive`}
                                        allocations={req.allocations.map(a => ({
                                            barcode: a.barcode,
                                            size: a.size,
                                            packedQuantity: a.packedQuantity,
                                            product: {
                                                name: a.product.name,
                                                code: a.product.code,
                                                color: a.product.color,
                                                producttype: a.product.producttype,
                                            },
                                        }))}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
