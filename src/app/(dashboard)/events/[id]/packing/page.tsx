import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowLeft, Package, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackingInterface } from "./PackingInterface";

async function getEventForPacking(id: string) {
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

export default async function PackingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventForPacking(id);

    if (!event || !['packing', 'packed'].includes(event.status)) {
        notFound();
    }

    const productRequest = event.requests[0];
    const equipmentRequest = event.requests[1];

    const isPacked = event.status === 'packed';

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
                        <h1 className="text-2xl font-bold text-slate-900">แพคสินค้า</h1>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isPacked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {isPacked ? 'แพคเสร็จแล้ว' : 'รอแพค'}
                        </span>
                    </div>
                    <p className="text-slate-500">{event.name} ({event.code})</p>
                </div>
            </div>

            {/* Event Info */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <MapPin className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">สถานที่</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Calendar className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">วันที่จัดงาน</p>
                            <p className="font-medium text-slate-900">
                                {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM yyyy")}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                            <Package className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">จำนวนรายการ</p>
                            <p className="font-medium text-slate-900">
                                {(productRequest?.items?.length || 0) + (equipmentRequest?.items?.length || 0)} รายการ
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Packing Interface */}
            {/* Logic: If already packed, we might still want to see what was packed, or simple view mode. 
                For now, we use the same interface but maybe we should disable it if status is 'packed'? 
                Actually, let's keep it editable or just viewable. The Interface handles "Confirm". 
                If 'packed', maybe we redirect or show a summary? 
                The user flow is: Packing -> Confirm -> Status becomes Packed.
            */}

            <PackingInterface
                eventId={event.id}
                items={productRequest?.items || []}
                equipment={equipmentRequest?.items || []}
                initialStatus={event.status}
            />
        </div>
    );
}
