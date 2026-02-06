import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, MapPin, Truck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RefillShippingForm } from "./RefillShippingForm";

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
                    startDate: true,
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

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RefillShippingPage({ params }: Props) {
    const { id } = await params;
    const request = await getRefillRequest(id);

    if (!request) {
        notFound();
    }

    // If already shipped, redirect back
    if (request.status === 'shipped') {
        redirect('/warehouse/packing');
    }

    // If not packed yet, redirect to packing
    if (request.status === 'approved') {
        redirect(`/warehouse/packing/refill/${id}`);
    }

    const totalItems = request.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/warehouse/packing"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">สร้างการจัดส่ง - เบิกเพิ่ม</h1>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {request.event.name} ({request.event.code})
                    </p>
                </div>
            </div>

            {/* Event Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลการจัดส่ง</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">สถานที่จัดส่ง</p>
                            <p className="font-medium text-slate-900">{request.event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">จำนวนสินค้า</p>
                            <p className="font-medium text-slate-900">{totalItems} ชิ้น ({request.items.length} รายการ)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Truck className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Event เริ่ม</p>
                            <p className="font-medium text-slate-900">{format(new Date(request.event.startDate), "d MMM yyyy", { locale: th })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    รายการสินค้าที่จัดส่ง
                </h3>
                <div className="divide-y divide-slate-100">
                    {request.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                <p className="text-xs text-slate-400 font-mono">
                                    {item.product.code || item.barcode} {item.product.size ? `• ${item.product.size}` : ''}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-blue-600">{item.quantity}</span>
                                <span className="text-sm text-slate-400 ml-1">ชิ้น</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Shipping Form */}
            <RefillShippingForm requestId={request.id} />
        </div>
    );
}
