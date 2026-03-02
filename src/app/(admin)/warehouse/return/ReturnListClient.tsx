"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { MapPin, ArrowRight, Calendar, Truck, Undo2, CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface ReturnEvent {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    totalReturn: number;
    itemCount: number;
}

function matchSearch(e: ReturnEvent, s: string) {
    return e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s) || e.location.toLowerCase().includes(s);
}

export function ReturnListClient({ returning, returned }: { returning: ReturnEvent[]; returned: ReturnEvent[] }) {
    const [search, setSearch] = useState('');
    const s = search.toLowerCase();

    const filteredReturning = useMemo(() => s ? returning.filter(e => matchSearch(e, s)) : returning, [returning, s]);
    const filteredReturned = useMemo(() => s ? returned.filter(e => matchSearch(e, s)) : returned, [returned, s]);

    const total = returning.length + returned.length;
    const filteredTotal = filteredReturning.length + filteredReturned.length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Undo2}
                title="รับคืนสินค้า"
                subtitle="รายการสินค้าที่กำลังส่งคืนจาก Event"
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
                    <p className="text-xs text-slate-400 mt-2">พบ {filteredTotal} จาก {total} รายการ</p>
                )}
            </div>

            {/* Returning Events */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-500" />
                        กำลังส่งคืน
                        <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{filteredReturning.length}</span>
                    </h2>
                </div>

                {filteredReturning.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon={Undo2} message="ไม่มีสินค้าที่รอรับคืน" description="เมื่อ PC ส่งคืนสินค้า จะแสดงที่นี่" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredReturning.map(event => (
                            <Link key={event.id} href={`/warehouse/return/${event.id}`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-amber-50">
                                    <Truck className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{event.name}</h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{event.code}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                                        {event.startDate && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(event.startDate), "d MMM", { locale: th })} – {event.endDate ? format(new Date(event.endDate), "d MMM yy", { locale: th }) : '—'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-sm font-bold text-slate-800">{event.totalReturn.toLocaleString()}</p>
                                    <p className="text-[11px] text-slate-400">{event.itemCount} รายการ</p>
                                </div>
                                <span className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                    <Truck className="h-3 w-3" /> กำลังส่ง
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Returned History */}
            {filteredReturned.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ประวัติรับคืน
                            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{filteredReturned.length}</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {filteredReturned.map(event => (
                            <Link key={event.id} href={`/warehouse/return/${event.id}`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-emerald-50">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{event.name}</h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{event.code}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                                        <span className="hidden sm:inline text-slate-200">·</span>
                                        <span>{event.totalReturn.toLocaleString()} ชิ้น · {event.itemCount} รายการ</span>
                                    </div>
                                </div>
                                <span className="flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">✓ คืนแล้ว</span>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
