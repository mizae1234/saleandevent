"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Package, MapPin, Hash, Calendar, DollarSign, Clock, ArrowRight, ClipboardCheck, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import ApprovalActions from "./ApprovalActions";
import ChannelApprovalActions from "./ChannelApprovalActions";

type FilterTab = "all" | "channels" | "requests" | "payments";

interface PendingChannel {
    id: string;
    name: string;
    code: string;
    location: string;
    type: string;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    staff: { staff: { name: string } }[];
}

interface PendingRequest {
    id: string;
    requestType: string;
    requestedTotalQuantity: number;
    notes: string | null;
    createdAt: string;
    channel: { id: string; name: string; code: string; location: string };
}

interface PendingPayment {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    totalExpenses: number;
    expenseCount: number;
    staffCount: number;
}

interface Props {
    pendingChannels: PendingChannel[];
    pendingRequests: PendingRequest[];
    pendingPayments: PendingPayment[];
}

export function ApprovalsClient({ pendingChannels, pendingRequests, pendingPayments }: Props) {
    const [filter, setFilter] = useState<FilterTab>("all");
    const [search, setSearch] = useState("");

    const q = search.toLowerCase();

    const filteredChannels = useMemo(() => {
        if (filter !== "all" && filter !== "channels") return [];
        if (!q) return pendingChannels;
        return pendingChannels.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q)
        );
    }, [pendingChannels, filter, q]);

    const filteredRequests = useMemo(() => {
        if (filter !== "all" && filter !== "requests") return [];
        if (!q) return pendingRequests;
        return pendingRequests.filter(r =>
            r.channel.name.toLowerCase().includes(q) ||
            r.channel.code.toLowerCase().includes(q) ||
            r.channel.location.toLowerCase().includes(q)
        );
    }, [pendingRequests, filter, q]);

    const filteredPayments = useMemo(() => {
        if (filter !== "all" && filter !== "payments") return [];
        if (!q) return pendingPayments;
        return pendingPayments.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q)
        );
    }, [pendingPayments, filter, q]);

    const totalPending = pendingChannels.length + pendingRequests.length + pendingPayments.length;

    const filterTabs: { key: FilterTab; label: string; count: number; color: string }[] = [
        { key: "all", label: "ทั้งหมด", count: totalPending, color: "bg-slate-600" },
        { key: "channels", label: "Event", count: pendingChannels.length, color: "bg-amber-600" },
        { key: "requests", label: "คำขอสินค้า", count: pendingRequests.length, color: "bg-teal-600" },
        { key: "payments", label: "อนุมัติจ่าย", count: pendingPayments.length, color: "bg-blue-600" },
    ];

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

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex gap-1 overflow-x-auto">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                filter === tab.key
                                    ? `${tab.color} text-white shadow-sm`
                                    : "text-slate-500 hover:bg-slate-100"
                            }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                filter === tab.key ? "bg-white/20" : "bg-slate-100"
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="ค้นหา (ชื่อ, รหัส, สถานที่)..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                    />
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
                    {filteredChannels.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-amber-500" />
                                    Event รออนุมัติ
                                    <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{filteredChannels.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {filteredChannels.map(ch => (
                                    <div key={ch.id} className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-amber-50">
                                                <Calendar className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Link href={`/channels/${ch.id}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 truncate transition-colors">
                                                        {ch.name}
                                                    </Link>
                                                    <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                        {ch.code}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {ch.location || '—'}
                                                    </span>
                                                    {ch.startDate && (
                                                        <>
                                                            <span className="hidden sm:inline text-slate-200">·</span>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(new Date(ch.startDate), 'd MMM', { locale: th })} – {ch.endDate ? format(new Date(ch.endDate), 'd MMM yy', { locale: th }) : '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {format(new Date(ch.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                                    </span>
                                                </div>
                                            </div>
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
                    {filteredRequests.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-teal-600" />
                                    คำขอสินค้ารออนุมัติ
                                    <span className="ml-auto text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{filteredRequests.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {filteredRequests.map(req => (
                                    <div key={req.id} className="p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-teal-50">
                                                <Package className="h-5 w-5 text-teal-600" />
                                            </div>
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
                                                        <Clock className="h-3 w-3" /> {format(new Date(req.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                                    </span>
                                                </div>
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
                    {filteredPayments.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                    รออนุมัติจ่าย
                                    <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{filteredPayments.length}</span>
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {filteredPayments.map(ev => {
                                    const isPending = ev.status === 'pending_payment';
                                    return (
                                        <Link
                                            key={ev.id}
                                            href={`/channels/approvals/payment/${ev.id}`}
                                            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                        >
                                            <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-blue-50">
                                                <DollarSign className="h-5 w-5 text-blue-600" />
                                            </div>
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
                                                                {format(new Date(ev.startDate), 'd MMM', { locale: th })} – {ev.endDate ? format(new Date(ev.endDate), 'd MMM yy', { locale: th }) : '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="text-xs text-slate-400">{ev.staffCount} พนักงาน</span>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-sm font-bold text-rose-600">฿{ev.totalExpenses.toLocaleString()}</p>
                                                <p className="text-[11px] text-slate-400 hidden sm:block">{ev.expenseCount} รายการ</p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* No results for filter */}
                    {filteredChannels.length === 0 && filteredRequests.length === 0 && filteredPayments.length === 0 && totalPending > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                            <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">ไม่พบรายการที่ตรงกับการค้นหา</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
