import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, ChevronRight, DollarSign, MapPin, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function PaymentApprovalListPage() {
    const events = await db.salesChannel.findMany({
        where: {
            status: {
                in: ['pending_payment', 'payment_approved']
            }
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            expenses: { select: { amount: true } },
            staff: { select: { id: true } },
            _count: { select: { expenses: true } },
        }
    });

    const pendingCount = events.filter(e => e.status === 'pending_payment').length;
    const approvedCount = events.filter(e => e.status === 'payment_approved').length;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รออนุมัติจ่าย</h1>
                <p className="text-slate-500">ตรวจสอบค่าใช้จ่ายและค่าตอบแทนก่อนอนุมัติจ่าย</p>
            </div>

            {/* Summary Tabs */}
            <div className="flex gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800">รออนุมัติ {pendingCount}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800">อนุมัติแล้ว {approvedCount}</span>
                </div>
            </div>

            {/* Event List */}
            <div className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {events.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            ไม่มีรายการรออนุมัติจ่าย
                        </div>
                    ) : (
                        events.map((event) => {
                            const totalExpenses = event.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
                            const isPending = event.status === 'pending_payment';

                            return (
                                <Link
                                    key={event.id}
                                    href={`/channels/approvals/payment/${event.id}`}
                                    className="block hover:bg-slate-50 transition-colors"
                                >
                                    <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-slate-900 truncate">{event.name}</h3>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isPending
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                    {isPending ? (
                                                        <><Clock className="h-3 w-3" /> รออนุมัติ</>
                                                    ) : (
                                                        <><CheckCircle2 className="h-3 w-3" /> อนุมัติแล้ว</>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(event.startDate!), "d MMM")} - {format(new Date(event.endDate!), "d MMM yyyy")}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {event.location}
                                                </span>
                                                <span className="flex items-center gap-1 font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">
                                                    <DollarSign className="h-3 w-3" />
                                                    ฿{totalExpenses.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {event.staff.length} พนักงาน • {event._count.expenses} รายจ่าย
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-400" />
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
