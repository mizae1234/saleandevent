import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, MapPin, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmReturnClient } from "./ConfirmReturnClient";

async function getEventForReturn(id: string) {
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

export default async function WarehouseReturnDetailPage({ params }: Props) {
    const { id } = await params;
    const event = await getEventForReturn(id);

    if (!event) {
        notFound();
    }

    // Only returning events can be confirmed
    if (event.status !== 'returning') {
        return (
            <div className="space-y-6">
                <div className="rounded-xl bg-amber-50 p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-700 font-medium">Event นี้ไม่อยู่ในสถานะกำลังส่งคืน</p>
                    <p className="text-sm text-amber-600 mt-1">สถานะปัจจุบัน: {event.status}</p>
                    <Link
                        href="/warehouse/return"
                        className="inline-block mt-4 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    >
                        กลับหน้ารายการ
                    </Link>
                </div>
            </div>
        );
    }

    const returnSummary = event.returnSummaries[0];
    if (!returnSummary) {
        redirect('/warehouse/return');
    }

    const totalReturn = returnSummary.items.reduce((sum, item) => sum + item.remainingQuantity, 0);
    const totalDamaged = returnSummary.items.reduce((sum, item) => sum + item.damagedQuantity, 0);
    const totalMissing = returnSummary.items.reduce((sum, item) => sum + item.missingQuantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/warehouse/return"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">รับคืนสินค้า</h1>
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
                            <p className="text-xs text-slate-500">สถานที่</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ระยะเวลา</p>
                            <p className="font-medium text-slate-900">
                                {format(new Date(event.startDate!), "d MMM", { locale: th })} - {format(new Date(event.endDate!), "d MMM", { locale: th })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ปิดยอดเมื่อ</p>
                            <p className="font-medium text-slate-900">
                                {format(new Date(returnSummary.submittedAt), "d MMM yyyy HH:mm", { locale: th })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-emerald-50 p-4 text-center">
                    <p className="text-xs text-emerald-600 mb-1">ส่งคืน</p>
                    <p className="text-2xl font-bold text-emerald-700">{totalReturn}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 text-center">
                    <p className="text-xs text-amber-600 mb-1">ชำรุด</p>
                    <p className="text-2xl font-bold text-amber-700">{totalDamaged}</p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 text-center">
                    <p className="text-xs text-red-600 mb-1">สูญหาย</p>
                    <p className="text-2xl font-bold text-red-700">{totalMissing}</p>
                </div>
            </div>

            {/* Items List */}
            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-500" />
                        รายการสินค้าที่ส่งคืน
                    </h3>
                </div>

                <div className="divide-y divide-slate-100">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-500">
                        <div className="col-span-5">สินค้า</div>
                        <div className="col-span-2 text-center">ขายแล้ว</div>
                        <div className="col-span-2 text-center">ชำรุด</div>
                        <div className="col-span-1 text-center">หาย</div>
                        <div className="col-span-2 text-center">ส่งคืน</div>
                    </div>

                    {/* Items */}
                    {returnSummary.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                            <div className="col-span-5">
                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                <p className="text-xs text-slate-400">
                                    {item.product.code || item.barcode} {item.product.size && `• ${item.product.size}`}
                                </p>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className="text-blue-600 font-medium">{item.soldQuantity}</span>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className={`font-medium ${item.damagedQuantity > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {item.damagedQuantity}
                                </span>
                            </div>
                            <div className="col-span-1 text-center">
                                <span className={`font-medium ${item.missingQuantity > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {item.missingQuantity}
                                </span>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className="text-lg font-bold text-emerald-600">{item.remainingQuantity}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirm Button */}
            <ConfirmReturnClient channelId={event.id} totalReturn={totalReturn} />
        </div>
    );
}
