"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, ArrowRight, Calendar, TrendingUp, Store, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface EventData {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    salesCount: number;
    totalStock: number;
    soldQuantity: number;
    remainingStock: number;
    totalSales: number;
}

const STATUS_TABS = [
    { key: 'active', label: 'กำลังขาย' },
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'closed', label: 'ปิดแล้ว' },
    { key: 'returned', label: 'คืนแล้ว' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    active: { label: "กำลังขาย", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    selling: { label: "กำลังขาย", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    packing: { label: "กำลังแพ็ค", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    shipped: { label: "จัดส่งแล้ว", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
    received: { label: "รับแล้ว", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
    returned: { label: "คืนแล้ว", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
    closed: { label: "ปิดงาน", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
};

function fmt(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CloseListClient({ events }: { events: EventData[] }) {
    const [statusFilter, setStatusFilter] = useState('active');
    const [search, setSearch] = useState('');

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (statusFilter !== 'all' && e.status !== statusFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s) || e.location.toLowerCase().includes(s);
            }
            return true;
        });
    }, [events, statusFilter, search]);

    const totalSales = filteredEvents.reduce((s, e) => s + e.totalSales, 0);
    const totalRemaining = filteredEvents.reduce((s, e) => s + e.remainingStock, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Store}
                title="ปิดยอด/ส่งคืน"
                subtitle="เลือก Event ที่ต้องการปิดยอดและส่งคืนสินค้า"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">แสดง</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{filteredEvents.length}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">ช่องทาง</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-teal-400/20">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ยอดขายรวม</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">฿{fmt(totalSales)}</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-emerald-400/20">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">คงเหลือ</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{fmt(totalRemaining)}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">ชิ้น</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-amber-400/20">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา Event..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                        />
                    </div>
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${statusFilter === tab.key
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                {(search || statusFilter !== 'active') && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filteredEvents.length} จาก {events.length} ช่องทาง</p>
                )}
            </div>

            {/* Event List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredEvents.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Package}
                            message="ไม่พบ Event ที่ตรงกับตัวกรอง"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredEvents.map((event) => {
                            const soldPct = event.totalStock > 0 ? Math.round((event.soldQuantity / event.totalStock) * 100) : 0;
                            const status = STATUS_CONFIG[event.status] || { label: event.status, bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" };

                            return (
                                <Link
                                    key={event.id}
                                    href={`/pc/close/${event.id}`}
                                    className="block p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-emerald-50">
                                            <Store className="h-5 w-5 text-emerald-600" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                                    {event.name}
                                                </h3>
                                                <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                    {event.code}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {event.location}
                                                </span>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {event.startDate ? format(new Date(event.startDate), "d MMM", { locale: th }) : '—'} – {event.endDate ? format(new Date(event.endDate), "d MMM yy", { locale: th }) : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0 text-right hidden sm:block">
                                            <p className="text-sm font-bold text-emerald-600">฿{fmt(event.totalSales)}</p>
                                            <p className="text-[11px] text-slate-400">{event.salesCount} บิล</p>
                                        </div>

                                        <span className={`flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text} border ${status.border}`}>
                                            {status.label}
                                        </span>

                                        <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                                    </div>

                                    {/* Progress bar */}
                                    <div className="mt-3 sm:ml-[52px]">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="text-slate-400">
                                                ขายแล้ว <span className="font-semibold text-slate-600">{fmt(event.soldQuantity)}</span> / {fmt(event.totalStock)}
                                            </span>
                                            <span className="font-semibold text-amber-600">{fmt(event.remainingStock)} คงเหลือ</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500"
                                                style={{ width: `${soldPct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile: sales + status */}
                                    <div className="mt-2 flex items-center justify-between sm:hidden">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.bg} ${status.text} border ${status.border}`}>
                                            {status.label}
                                        </span>
                                        <span className="text-sm font-bold text-emerald-600">฿{fmt(event.totalSales)}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
