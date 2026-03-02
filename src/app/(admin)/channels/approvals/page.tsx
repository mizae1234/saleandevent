import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle2, Package, MapPin, Hash, Calendar, DollarSign, ChevronRight, ClipboardCheck, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";
import ApprovalActions from "./ApprovalActions";
import ChannelApprovalActions from "./ChannelApprovalActions";

export default async function ApprovalsPage() {
    const [pendingChannels, pendingRequests, pendingPayments] = await Promise.all([
        db.salesChannel.findMany({
            where: { status: 'submitted' },
            include: { staff: { select: { staff: { select: { name: true } } } } },
            orderBy: { createdAt: 'asc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'submitted' },
            include: { channel: true },
            orderBy: { createdAt: 'asc' },
        }),
        db.salesChannel.findMany({
            where: { status: { in: ['pending_payment', 'payment_approved'] } },
            include: {
                expenses: { select: { amount: true } },
                staff: { select: { id: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    const totalPending = pendingChannels.length + pendingRequests.length + pendingPayments.length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={ClipboardCheck}
                title="รออนุมัติ"
                subtitle={`${totalPending} รายการรอดำเนินการ`}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">Event</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{pendingChannels.length}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-amber-400/20">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">คำขอสินค้า</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{pendingRequests.length}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-teal-400/20">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">อนุมัติจ่าย</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{pendingPayments.length}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-blue-400/20">
                            <DollarSign className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>
            </div>

            {totalPending === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">ไม่มีรายการรออนุมัติ ✓</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* ── Section 1: Pending Channels/Events ── */}
                    {pendingChannels.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    Event รออนุมัติ
                                    <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{pendingChannels.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {pendingChannels.map(ch => (
                                    <div key={ch.id} className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                            {/* Icon - hidden on mobile */}
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-amber-50">
                                                <Calendar className="h-5 w-5 text-amber-600" />
                                            </div>

                                            {/* Main Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Link href={`/channels/${ch.id}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 truncate transition-colors">
                                                        {ch.name}
                                                    </Link>
                                                    <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                        {ch.code}
                                                    </span>
                                                </div>

                                                {/* Details - stack on mobile, inline on desktop */}
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {ch.location || '—'}
                                                    </span>
                                                    {ch.startDate && (
                                                        <>
                                                            <span className="hidden sm:inline text-slate-200">·</span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(ch.startDate, 'd MMM', { locale: th })} – {ch.endDate ? format(ch.endDate, 'd MMM yy', { locale: th }) : '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(ch.createdAt, 'd MMM yy HH:mm', { locale: th })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex-shrink-0 mt-2 sm:mt-0">
                                                <ChannelApprovalActions channelId={ch.id} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Section 2: Pending Stock Requests ── */}
                    {pendingRequests.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-teal-600" />
                                    คำขอสินค้ารออนุมัติ
                                    <span className="ml-auto text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                            {/* Icon */}
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-teal-50">
                                                <Package className="h-5 w-5 text-teal-600" />
                                            </div>

                                            {/* Main Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <h3 className="text-sm font-bold text-slate-900 truncate">{req.channel.name}</h3>
                                                    <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                        {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="h-3 w-3" /> {req.channel.code}
                                                    </span>
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {req.channel.location || '—'}
                                                    </span>
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}
                                                    </span>
                                                </div>

                                                {/* Quantity badge */}
                                                <div className="mt-2 flex items-center gap-3">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 rounded-lg text-sm font-bold text-teal-700">
                                                        <Package className="h-3.5 w-3.5" />
                                                        {req.requestedTotalQuantity.toLocaleString()} ชิ้น
                                                    </span>
                                                    {req.notes && (
                                                        <span className="text-xs text-slate-400 italic truncate">📝 {req.notes}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex-shrink-0 mt-2 sm:mt-0">
                                                <ApprovalActions requestId={req.id} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Section 3: Payment Approvals ── */}
                    {pendingPayments.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                    รออนุมัติจ่าย
                                    <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{pendingPayments.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {pendingPayments.map(ev => {
                                    const totalExpenses = ev.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
                                    const isPending = ev.status === 'pending_payment';

                                    return (
                                        <Link
                                            key={ev.id}
                                            href={`/channels/approvals/payment/${ev.id}`}
                                            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                        >
                                            {/* Icon */}
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-blue-50">
                                                <DollarSign className="h-5 w-5 text-blue-600" />
                                            </div>

                                            {/* Main Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                                        {ev.name}
                                                    </h3>
                                                    <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${isPending ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                        {isPending ? 'รออนุมัติ' : '✓ อนุมัติแล้ว'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {ev.location || '—'}
                                                    </span>
                                                    {ev.startDate && (
                                                        <>
                                                            <span className="hidden sm:inline text-slate-200">·</span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(ev.startDate, 'd MMM', { locale: th })} – {ev.endDate ? format(ev.endDate, 'd MMM yy', { locale: th }) : '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="text-xs text-slate-400">{ev.staff.length} พนักงาน</span>
                                                </div>
                                            </div>

                                            {/* Expense Amount */}
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-sm font-bold text-rose-600">฿{totalExpenses.toLocaleString()}</p>
                                                <p className="text-[11px] text-slate-400 hidden sm:block">{ev.expenses.length} รายการ</p>
                                            </div>

                                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
