"use client";

import { useState, useMemo } from "react";
import { fmt } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Receipt, Calendar, MapPin, ArrowRight, Search, TrendingUp, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";
import { getChannelStatus } from "@/config/status";

interface Sale {
    id: string;
    totalAmount: any;
    soldAt: Date;
}

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: Date;
    sales: Sale[];
}

interface Props {
    events: Event[];
}





export function SalesEventListClient({ events }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('active');

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            if (statusFilter !== 'all' && event.status !== statusFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return event.name.toLowerCase().includes(s) || event.code.toLowerCase().includes(s) || event.location.toLowerCase().includes(s);
            }
            return true;
        });
    }, [events, search, statusFilter]);

    // Summary stats
    const totalSales = events.reduce((s, e) => s + e.sales.reduce((a, sale) => a + parseFloat(sale.totalAmount.toString()), 0), 0);
    const totalBills = events.reduce((s, e) => s + e.sales.length, 0);
    const activeCount = events.filter(e => ['active', 'selling'].includes(e.status)).length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Receipt}
                title="รายการขาย"
                subtitle="เลือก Event เพื่อดูรายการขาย"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ยอดขายรวม</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">฿{fmt(totalSales)}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">{fmt(totalBills)} บิล</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-emerald-400/20">
                            <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">ช่องทาง</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{events.length}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">ทั้งหมด</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-teal-400/20">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">กำลังขาย</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{activeCount}</p>
                            <p className="text-xs text-white/60 mt-0.5 hidden sm:block">ช่องทาง</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-blue-400/20">
                            <Receipt className="h-5 w-5 text-white" />
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
                            placeholder="ค้นหา Event / สาขา..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                        />
                    </div>
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                        {[
                            { key: 'all', label: 'ทั้งหมด' },
                            { key: 'active', label: 'กำลังขาย' },
                            { key: 'closed', label: 'ปิดแล้ว' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key as any)}
                                className={`px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${statusFilter === tab.key
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                {(search || statusFilter !== 'all') && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filteredEvents.length} จาก {events.length} ช่องทาง</p>
                )}
            </div>

            {/* Event List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredEvents.length === 0 ? (
                    <div className="p-8">
                        <EmptyState icon={Receipt} message="ไม่พบ Event ที่ตรงกับการค้นหา" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredEvents.map(event => {
                            const totalAmount = event.sales.reduce((s, sale) => s + parseFloat(sale.totalAmount.toString()), 0);
                            const salesCount = event.sales.length;
                            const todaySales = event.sales.filter(s =>
                                format(new Date(s.soldAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            ).length;
                            const status = getChannelStatus(event.status);

                            return (
                                <Link
                                    key={event.id}
                                    href={`/pc/sales/channel/${event.id}`}
                                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                >
                                    {/* Icon */}
                                    <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-emerald-50">
                                        <Receipt className="h-5 w-5 text-emerald-600" />
                                    </div>

                                    {/* Main Info */}
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
                                                {format(new Date(event.startDate!), "d MMM yy", { locale: th })}
                                            </span>
                                            {todaySales > 0 && (
                                                <>
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="text-emerald-600 font-medium">+{todaySales} วันนี้</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sales Amount */}
                                    <div className="flex-shrink-0 text-right">
                                        {totalAmount > 0 ? (
                                            <>
                                                <p className="text-sm font-bold text-emerald-600">฿{fmt(totalAmount)}</p>
                                                <p className="text-[11px] text-slate-400">{salesCount} บิล</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-300">—</p>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <span className={`flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text} border ${status.border}`}>
                                        {status.label}
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
