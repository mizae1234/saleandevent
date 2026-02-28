import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Banknote, Calendar, MapPin, ChevronRight, Users, Store } from "lucide-react";
import Link from "next/link";

export default async function PayrollEventSelectPage() {
    const events = await db.salesChannel.findMany({
        where: {
            status: { notIn: ['draft'] },
        },
        include: {
            _count: { select: { staff: true } },
        },
        orderBy: { startDate: 'desc' },
    });

    const statusConfig: Record<string, { label: string; color: string }> = {
        submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
        approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
        active: { label: 'กำลังขาย', color: 'bg-emerald-100 text-emerald-700' },
        pending_return: { label: 'รอส่งคืน', color: 'bg-orange-100 text-orange-700' },
        returning: { label: 'กำลังส่งคืน', color: 'bg-purple-100 text-purple-700' },
        returned: { label: 'รับคืนแล้ว', color: 'bg-teal-100 text-teal-700' },
        pending_payment: { label: 'รออนุมัติจ่าย', color: 'bg-amber-100 text-amber-700' },
        payment_approved: { label: 'อนุมัติจ่ายแล้ว', color: 'bg-emerald-100 text-emerald-700' },
        completed: { label: 'ปิดงาน', color: 'bg-slate-200 text-slate-600' },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Banknote className="h-6 w-6 text-teal-600" />
                    สรุปค่าแรง / ค่าคอม
                </h1>
                <p className="text-sm text-slate-500 mt-1">เลือก Event เพื่อดูสรุปค่าแรงและข้อมูลโอนเงิน</p>
            </div>

            {/* Event List */}
            <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {events.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <Store className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p>ไม่พบ Event</p>
                        </div>
                    ) : (
                        events.map(event => {
                            const status = statusConfig[event.status] || { label: event.status, color: 'bg-slate-100 text-slate-600' };
                            return (
                                <Link
                                    key={event.id}
                                    href={`/hr/payroll/${event.id}`}
                                    className="block hover:bg-slate-50 transition-colors"
                                >
                                    <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-slate-900 truncate">{event.name}</h3>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {event.location}
                                                </span>
                                                {event.startDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {format(event.startDate, 'd MMM', { locale: th })}
                                                        {event.endDate && ` - ${format(event.endDate, 'd MMM yy', { locale: th })}`}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    <Users className="h-3 w-3" />
                                                    {event._count.staff} คน
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
