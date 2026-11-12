"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
    Banknote,
    Calendar,
    MapPin,
    ArrowRight,
    Users,
    Search,
    Store,
    CheckCircle2,
    Clock,
    CircleDot,
    CalendarDays,
    Building2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/shared";
import { getChannelStatus } from "@/config/status";
import { formatPeriodMonthThai } from "@/lib/payroll-period";

interface PayrollEvent {
    id: string;
    type: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    staffCount: number;
    wagePaid: number;
    comPaid: number;
    submitted: number;
}

const PAY_FILTER_OPTIONS = [
    { key: 'all', label: 'สถานะจ่าย: ทั้งหมด' },
    { key: 'paid', label: 'จ่ายครบแล้ว' },
    { key: 'partial', label: 'จ่ายบางส่วน' },
    { key: 'unpaid', label: 'ยังไม่จ่าย' },
];

function getPayStatus(e: PayrollEvent): 'paid' | 'partial' | 'unpaid' {
    if (e.staffCount === 0) return 'unpaid';
    if (e.wagePaid >= e.staffCount && e.comPaid >= e.staffCount) return 'paid';
    if (e.wagePaid > 0 || e.comPaid > 0) return 'partial';
    return 'unpaid';
}

interface Props {
    events: PayrollEvent[];
    periodMonth: string;
    periodOptions: { value: string; label: string }[];
}

export function PayrollListClient({ events, periodMonth, periodOptions }: Props) {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'EVENT' | 'BRANCH'>('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [payFilter, setPayFilter] = useState('all');

    const eventCount = useMemo(() => events.filter(e => e.type !== 'BRANCH').length, [events]);
    const branchCount = useMemo(() => events.filter(e => e.type === 'BRANCH').length, [events]);

    // Dynamic status tabs from events data
    const statusTabs = useMemo(() => {
        const counts = new Map<string, number>();
        events.forEach(e => counts.set(e.status, (counts.get(e.status) || 0) + 1));
        const tabs: { key: string; label: string; count: number }[] = [{ key: 'all', label: 'สถานะ: ทั้งหมด', count: events.length }];
        counts.forEach((count, status) => {
            const config = getChannelStatus(status);
            tabs.push({ key: status, label: config.label, count });
        });
        return tabs;
    }, [events]);

    const filtered = useMemo(() => {
        return events.filter(e => {
            if (typeFilter === 'EVENT' && e.type === 'BRANCH') return false;
            if (typeFilter === 'BRANCH' && e.type !== 'BRANCH') return false;
            if (statusFilter !== 'all' && e.status !== statusFilter) return false;
            if (payFilter !== 'all' && getPayStatus(e) !== payFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return e.name.toLowerCase().includes(s) ||
                    e.code.toLowerCase().includes(s) ||
                    e.location.toLowerCase().includes(s);
            }
            return true;
        });
    }, [events, typeFilter, search, statusFilter, payFilter]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    icon={Banknote}
                    title="สรุปค่าแรง / เงินเดือน / ค่าคอม"
                    subtitle="เลือก Event หรือ สาขา (รายเดือน รอบจ่ายวันที่ 30) เพื่อดูสรุปและทำรายการโอนเงิน"
                />

                {/* Month selector for Branch payrolls */}
                <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2">
                    <CalendarDays className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-semibold text-indigo-600 uppercase leading-none mb-0.5">
                            งวดเบิกสาขา (รายเดือน)
                        </p>
                        <select
                            value={periodMonth}
                            onChange={(e) => router.push(`/hr/payroll?period=${e.target.value}`)}
                            className="bg-transparent text-xs font-bold text-indigo-950 focus:outline-none cursor-pointer"
                        >
                            {periodOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Type Tabs */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        typeFilter === 'all'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    ทั้งหมด ({events.length})
                </button>
                <button
                    type="button"
                    onClick={() => setTypeFilter('EVENT')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        typeFilter === 'EVENT'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Event ({eventCount})
                </button>
                <button
                    type="button"
                    onClick={() => setTypeFilter('BRANCH')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        typeFilter === 'BRANCH'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                    }`}
                >
                    <Building2 className="h-3.5 w-3.5" />
                    สาขา — รายเดือน ({branchCount})
                </button>
            </div>

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
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                    >
                        {statusTabs.map(tab => (
                            <option key={tab.key} value={tab.key}>
                                {tab.label} ({tab.count})
                            </option>
                        ))}
                    </select>
                    <select
                        value={payFilter}
                        onChange={(e) => setPayFilter(e.target.value)}
                        className="h-10 px-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                    >
                        {PAY_FILTER_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                {(search || typeFilter !== 'all' || statusFilter !== 'all' || payFilter !== 'all') && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filtered.length} จาก {events.length} รายการ</p>
                )}
            </div>

            {/* Event / Branch List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Store}
                            message={search || typeFilter !== 'all' || statusFilter !== 'all' || payFilter !== 'all' ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ไม่พบข้อมูล"}
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(event => {
                            const isBranch = event.type === 'BRANCH';
                            const status = getChannelStatus(event.status);
                            const wagePercent = event.staffCount > 0 ? Math.round((event.wagePaid / event.staffCount) * 100) : 0;
                            const href = isBranch
                                ? `/hr/payroll/${event.id}?period=${periodMonth}`
                                : `/hr/payroll/${event.id}`;

                            return (
                                <Link
                                    key={event.id}
                                    href={href}
                                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                                >
                                    <div className={`hidden sm:block flex-shrink-0 p-2.5 rounded-xl ${isBranch ? 'bg-indigo-50' : 'bg-teal-50'}`}>
                                        {isBranch ? (
                                            <Building2 className="h-5 w-5 text-indigo-600" />
                                        ) : (
                                            <Banknote className="h-5 w-5 text-teal-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                isBranch
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-teal-100 text-teal-700'
                                            }`}>
                                                {isBranch ? `สาขา • งวด ${formatPeriodMonthThai(periodMonth, true)}` : 'Event'}
                                            </span>
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
                                            {isBranch ? (
                                                <>
                                                    <span className="hidden sm:inline text-slate-200">·</span>
                                                    <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                                        <CalendarDays className="h-3 w-3" />
                                                        รอบจ่ายวันที่ 30 ({formatPeriodMonthThai(periodMonth)})
                                                    </span>
                                                </>
                                            ) : event.startDate && (
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

                                        {/* Payment Progress */}
                                        {event.staffCount > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    event.wagePaid >= event.staffCount
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : event.wagePaid > 0
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                    {event.wagePaid >= event.staffCount ? <CheckCircle2 className="h-3 w-3" /> : event.wagePaid > 0 ? <Clock className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                                                    {isBranch ? 'เงินเดือน/ค่าแรง' : 'ค่าแรง'} {event.wagePaid}/{event.staffCount}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    event.comPaid >= event.staffCount
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : event.comPaid > 0
                                                            ? 'bg-amber-50 text-amber-700'
                                                            : 'bg-slate-50 text-slate-500'
                                                }`}>
                                                    {event.comPaid >= event.staffCount ? <CheckCircle2 className="h-3 w-3" /> : event.comPaid > 0 ? <Clock className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
                                                    คอม {event.comPaid}/{event.staffCount}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                    event.submitted >= event.staffCount
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : event.submitted > 0
                                                            ? 'bg-blue-50 text-blue-500'
                                                            : 'bg-slate-50 text-slate-400'
                                                }`}>
                                                    ส่งเบิก {event.submitted}/{event.staffCount}
                                                </span>
                                                {/* Mini progress bar */}
                                                <div className="hidden sm:block w-16">
                                                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${wagePercent >= 100 ? 'bg-emerald-500' : wagePercent > 0 ? 'bg-amber-500' : 'bg-slate-200'}`}
                                                            style={{ width: `${wagePercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
