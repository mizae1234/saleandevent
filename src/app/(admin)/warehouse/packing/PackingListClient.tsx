"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, ArrowRight, MapPin, Clock, CheckCircle2, Hash, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface PackingRequest {
    id: string;
    status: string;
    requestType: string;
    requestedTotalQuantity: number;
    createdAt: string;
    allocatedTotal: number;
    channel: { id: string; name: string; code: string; location: string };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; action: string }> = {
    approved: { label: 'รอจัดสรร', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', action: 'อัพโหลด Excel' },
    allocated: { label: 'จัดสรรแล้ว', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', action: 'แพ็คสินค้า' },
    packed: { label: 'แพ็คแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', action: 'ดูรายละเอียด' },
};

export function PackingListClient({ requests }: { requests: PackingRequest[] }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search) return requests;
        const s = search.toLowerCase();
        return requests.filter(r =>
            r.channel.name.toLowerCase().includes(s) ||
            r.channel.code.toLowerCase().includes(s) ||
            r.channel.location.toLowerCase().includes(s)
        );
    }, [requests, search]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Package}
                title="จัดสรร & แพ็คสินค้า"
                subtitle={`${requests.length} รายการ`}
            />

            {/* Search */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event / สาขา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                    />
                </div>
                {search && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filtered.length} จาก {requests.length} รายการ</p>
                )}
            </div>

            {/* Request List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-8">
                        <EmptyState icon={Package} message={search ? "ไม่พบรายการที่ค้นหา" : "ไม่มีคำขอรอดำเนินการ"} />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(req => {
                            const config = STATUS_CONFIG[req.status] || { label: req.status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', action: '' };
                            const targetUrl = req.status === 'approved'
                                ? `/warehouse/allocate/${req.id}`
                                : `/channels/${req.id}/packing`;

                            return (
                                <Link key={req.id} href={targetUrl} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                    <div className={`hidden sm:block flex-shrink-0 p-2.5 rounded-xl ${config.bg}`}>
                                        <Package className={`h-5 w-5 ${config.text}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                                {req.channel.name}
                                            </h3>
                                            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                            <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {req.channel.code}</span>
                                            <span className="hidden sm:inline text-slate-200">·</span>
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.channel.location || '—'}</span>
                                            <span className="hidden sm:inline text-slate-200">·</span>
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(req.createdAt), 'd MMM yy HH:mm', { locale: th })}</span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                                                <Package className="h-3 w-3" /> ขอ {req.requestedTotalQuantity.toLocaleString()} ชิ้น
                                            </span>
                                            {req.allocatedTotal > 0 && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 rounded-lg text-xs font-semibold text-teal-700">
                                                    <CheckCircle2 className="h-3 w-3" /> จัดสรร {req.allocatedTotal.toLocaleString()} ชิ้น
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 text-right hidden sm:block">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                                            {config.label}
                                        </span>
                                        <p className="text-[11px] text-teal-600 font-medium mt-1">{config.action}</p>
                                    </div>

                                    <span className={`sm:hidden flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                                        {config.label}
                                    </span>

                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
