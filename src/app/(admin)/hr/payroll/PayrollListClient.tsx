"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Banknote, Calendar, MapPin, ArrowRight, Users, Search, Store } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface PayrollEvent {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    staffCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    submitted: { label: 'รออนุมัติ', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    approved: { label: 'อนุมัติแล้ว', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
    active: { label: 'กำลังขาย', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    pending_return: { label: 'รอส่งคืน', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
    returning: { label: 'กำลังส่งคืน', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
    returned: { label: 'รับคืนแล้ว', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100' },
    pending_payment: { label: 'รออนุมัติจ่าย', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    payment_approved: { label: 'อนุมัติจ่ายแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
    completed: { label: 'ปิดงาน', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
    closed: { label: 'ปิดงาน', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
};

const STATUS_TABS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'active', label: 'กำลังขาย' },
    { key: 'returned', label: 'คืนแล้ว' },
    { key: 'completed', label: 'ปิดงาน' },
];

export function PayrollListClient({ events }: { events: PayrollEvent[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filtered = useMemo(() => {
        return events.filter(e => {
            if (statusFilter !== 'all' && e.status !== statusFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return e.name.toLowerCase().includes(s) ||
                    e.code.toLowerCase().includes(s) ||
                    e.location.toLowerCase().includes(s);
            }
            return true;
        });
    }, [events, search, statusFilter]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Banknote}
                title="สรุปค่าแรง / ค่าคอม"
                subtitle="เลือก Event เพื่อดูสรุปค่าแรงและข้อมูลโอนเงิน"
            />

            {/* Search + Filter */}
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
                {(search || statusFilter !== 'all') && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filtered.length} จาก {events.length} Event</p>
                )}
            </div>

            {/* Event List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Store}
                            message={search || statusFilter !== 'all' ? "ไม่พบ Event ที่ตรงกับตัวกรอง" : "ไม่พบ Event"}
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(event => {
                            const status = STATUS_CONFIG[event.status] || { label: event.status, bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
                            return (
                                <Link
                                    key={event.id}
                                    href={`/hr/payroll/${event.id}`}
                                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                >
                                    <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-teal-50">
                                        <Banknote className="h-5 w-5 text-teal-600" />
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
                                            {event.startDate && (
                                                <>
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(event.startDate), 'd MMM', { locale: th })}
                                                        {event.endDate && ` – ${format(new Date(event.endDate), 'd MMM yy', { locale: th })}`}
                                                    </span>
                                                </>
                                            )}
                                            <span className="hidden sm:inline text-slate-200">·</span>
                                            <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                <Users className="h-3 w-3" /> {event.staffCount} คน
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.bg} ${status.text} ${status.border}`}>
                                        {status.label}
                                    </span>

                                    {/* Mobile status */}
                                    <span className={`sm:hidden flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg} ${status.text} ${status.border}`}>
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
