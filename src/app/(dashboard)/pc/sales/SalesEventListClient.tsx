"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Receipt, Calendar, MapPin, ChevronRight, History, Search, Filter } from "lucide-react";
import Link from "next/link";

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');

    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            // Filter by status
            if (statusFilter !== 'all' && event.status !== statusFilter) {
                return false;
            }
            // Filter by search
            if (search) {
                const searchLower = search.toLowerCase();
                return (
                    event.name.toLowerCase().includes(searchLower) ||
                    event.code.toLowerCase().includes(searchLower) ||
                    event.location.toLowerCase().includes(searchLower)
                );
            }
            return true;
        });
    }, [events, search, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">รายการขาย</h1>
                <p className="text-slate-500">เลือก Event เพื่อดูรายการขาย</p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event / สาขา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'closed')}
                        className="px-3 py-2 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">ทั้งหมด</option>
                        <option value="active">กำลังขาย</option>
                        <option value="closed">ปิดแล้ว</option>
                    </select>
                </div>
            </div>

            {/* Result Count */}
            <p className="text-sm text-slate-500">
                พบ {filteredEvents.length} Event
            </p>

            {/* Events List */}
            {filteredEvents.length === 0 ? (
                <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ไม่พบ Event ที่ตรงกับการค้นหา</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredEvents.map(event => {
                        const totalSales = event.sales.reduce(
                            (sum, s) => sum + parseFloat(s.totalAmount.toString()),
                            0
                        );
                        const salesCount = event.sales.length;
                        const todaySales = event.sales.filter(s =>
                            format(new Date(s.soldAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ).length;

                        return (
                            <Link
                                key={event.id}
                                href={`/pc/sales/channel/${event.id}`}
                                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                        <Receipt className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                {event.name}
                                            </h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'active'
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {event.status === 'active' ? 'กำลังขาย' : 'ปิดแล้ว'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {event.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(event.startDate!), "d MMM yyyy", { locale: th })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-600">
                                            ฿{totalSales.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {salesCount} บิล
                                            {todaySales > 0 && (
                                                <span className="ml-2 text-emerald-600">
                                                    (+{todaySales} วันนี้)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
