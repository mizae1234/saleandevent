import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowLeft, Package, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShippingForm } from "./ShippingForm";

async function getEventForShipping(id: string) {
    const event = await db.event.findUnique({
        where: { id },
        include: {
            requests: {
                include: {
                    items: true
                }
            }
        }
    });
    return event;
}

export default async function ShippingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventForShipping(id);

    if (!event) {
        notFound();
    }

    // If already shipped, redirect to event detail
    if (event.status === 'shipped') {
        redirect(`/events/${event.id}`);
    }

    // If not packed yet, redirect to packing
    if (event.status === 'packing') {
        redirect(`/events/${event.id}/packing`);
    }

    const productRequest = event.requests[0];
    const totalItems = productRequest?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/events/packing"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">สร้างการจัดส่ง</h1>
                    </div>
                    <p className="text-slate-500">{event.name} ({event.code})</p>
                </div>
            </div>

            {/* Event Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูล Event</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <MapPin className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">สถานที่จัดส่ง</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">จำนวนสินค้า</p>
                            <p className="font-medium text-slate-900">{totalItems} ชิ้น</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Truck className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">วันที่ต้องถึง</p>
                            <p className="font-medium text-slate-900">{format(new Date(event.startDate), "d MMM yyyy")}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shipping Form */}
            <ShippingForm eventId={event.id} />
        </div>
    );
}
