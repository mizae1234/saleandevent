import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReturnShippingForm } from "./ReturnShippingForm";

async function getEventForReturnShipping(id: string) {
    const event = await db.salesChannel.findUnique({
        where: { id },
        include: {
            returnSummaries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
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
            }
        }
    });

    return event;
}

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ReturnShippingPage({ params }: Props) {
    const { id } = await params;
    const event = await getEventForReturnShipping(id);

    if (!event) {
        notFound();
    }

    // Only pending_return events can ship
    if (event.status !== 'pending_return') {
        redirect(`/pc/close`);
    }

    const returnSummary = event.returnSummaries[0];
    if (!returnSummary) {
        redirect(`/pc/close/${id}`);
    }

    const totalReturn = returnSummary.items.reduce((sum, item) => sum + item.remainingQuantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/pc/close/${id}`}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">จัดส่งสินค้าคืน</h1>
                    <p className="text-slate-500">{event.name} ({event.code})</p>
                </div>
            </div>

            {/* Event Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลการส่งคืน</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <MapPin className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ส่งจาก</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">จำนวนส่งคืน</p>
                            <p className="font-medium text-slate-900">{totalReturn} ชิ้น ({returnSummary.items.length} รายการ)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Truck className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ส่งไปยัง</p>
                            <p className="font-medium text-slate-900">คลังสินค้า</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-500" />
                    รายการสินค้าที่ส่งคืน
                </h3>
                <div className="divide-y divide-slate-100">
                    {returnSummary.items.filter(item => item.remainingQuantity > 0).map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                <p className="text-xs text-slate-400">
                                    {item.product.code || item.barcode} {item.product.size && `• ${item.product.size}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-emerald-600">{item.remainingQuantity}</span>
                                <span className="text-sm text-slate-400 ml-1">ชิ้น</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shipping Form */}
            <ReturnShippingForm channelId={event.id} />
        </div>
    );
}
