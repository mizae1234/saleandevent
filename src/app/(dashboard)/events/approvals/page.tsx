import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Package, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getPendingEvents() {
    const events = await db.event.findMany({
        where: { status: 'pending_approval' },
        orderBy: { createdAt: 'desc' },
        include: {
            staff: true,
            requests: {
                include: {
                    items: true
                }
            }
        }
    });
    return events;
}

export default async function ApprovalsPage() {
    const pendingEvents = await getPendingEvents();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">รายการรออนุมัติ</h2>
                <p className="text-slate-500">ตรวจสอบและอนุมัติ Event ที่รอดำเนินการ</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <AlertCircle className="h-6 w-6 text-amber-600" />
                <p className="text-amber-800 font-medium">
                    มี {pendingEvents.length} รายการรออนุมัติ
                </p>
            </div>

            {/* Pending Events List */}
            <div className="space-y-4">
                {pendingEvents.map((event) => {
                    const totalProducts = event.requests.reduce((acc, req) => acc + (req.items?.length || 0), 0);

                    return (
                        <div
                            key={event.id}
                            className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                {/* Event Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-900">{event.name}</h3>
                                        <span className="text-xs font-mono text-slate-400">{event.code}</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            <span>
                                                {format(new Date(event.startDate), "d MMM")} - {format(new Date(event.endDate), "d MMM")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <span>{event.staff.length} PC</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Package className="h-4 w-4 text-slate-400" />
                                            <span>{totalProducts} รายการ</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        {format(new Date(event.createdAt), "d MMM HH:mm")}
                                    </span>
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        ตรวจสอบและอนุมัติ
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {pendingEvents.length === 0 && (
                    <div className="text-center py-16 rounded-xl bg-slate-50/50">
                        <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-700">ไม่มีรายการรออนุมัติ</h3>
                        <p className="mt-1 text-sm text-slate-500">รายการทั้งหมดได้รับการอนุมัติเรียบร้อยแล้ว</p>
                    </div>
                )}
            </div>
        </div>
    );
}
