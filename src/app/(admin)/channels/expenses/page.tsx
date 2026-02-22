import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowRight, Calendar, Package, ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";

export default async function ExpensesEventListPage() {
    const events = await db.salesChannel.findMany({
        where: {
            status: {
                in: ['approved', 'packing', 'packed', 'shipped', 'in_progress', 'completed', 'pending_return', 'returning', 'returned']
            }
        },
        orderBy: {
            startDate: 'desc'
        },
        include: {
            _count: {
                select: { expenses: true }
            }
        }
    });

    const statusColors: Record<string, string> = {
        draft: "bg-gray-100 text-gray-800",
        pending_approval: "bg-amber-100 text-amber-800",
        approved: "bg-green-100 text-green-800",
        packing: "bg-orange-100 text-orange-800",
        packed: "bg-teal-100 text-teal-800",
        shipped: "bg-blue-100 text-blue-800",
        in_progress: "bg-indigo-100 text-indigo-800",
        completed: "bg-purple-100 text-purple-800",
        pending_return: "bg-red-100 text-red-800",
        returning: "bg-orange-100 text-orange-800",
        returned: "bg-emerald-100 text-emerald-800",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">บันทึกค่าใช้จ่าย</h1>
                    <p className="text-slate-500">เลือก Event ที่ต้องการจัดการค่าใช้จ่ายและค่าตอบแทน</p>
                </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {events.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            ไม่พบรายการ Event ที่กำลังดำเนินการ
                        </div>
                    ) : (
                        events.map((event) => (
                            <Link
                                key={event.id}
                                href={`/channels/${event.id}/expenses`}
                                className="block hover:bg-slate-50 transition-colors"
                            >
                                <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-slate-900 truncate">{event.name}</h3>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[event.status] || "bg-gray-100"}`}>
                                                {event.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {format(new Date(event.startDate!), "d MMM")} - {format(new Date(event.endDate!), "d MMM yyyy")}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Package className="h-3.5 w-3.5" />
                                                {event.location}
                                            </span>
                                            {event._count.expenses > 0 && (
                                                <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                                                    <Receipt className="h-3 w-3" />
                                                    {event._count.expenses} รายการ
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-400" />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
