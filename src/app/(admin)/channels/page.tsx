import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar, MapPin, Plus, Store, CalendarDays, Users, ArrowRight, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/shared";

import { EventFilters } from "./EventFilters";

const ITEMS_PER_PAGE = 20;
import { Prisma } from "@prisma/client";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: "แบบร่าง", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
    approved: { label: "อนุมัติ", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    active: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    selling: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    packing: { label: "กำลังแพ็ค", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" },
    shipped: { label: "จัดส่งแล้ว", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100" },
    received: { label: "รับสินค้าแล้ว", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-100" },
    returned: { label: "คืนสินค้าแล้ว", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
    closed: { label: "ปิดงาน", bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" },
    payment_approved: { label: "อนุมัติจ่าย", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof CalendarDays; bg: string; iconColor: string }> = {
    EVENT: { label: "อีเว้นท์", icon: CalendarDays, bg: "bg-violet-50", iconColor: "text-violet-600" },
    BRANCH: { label: "สาขา", icon: Store, bg: "bg-teal-50", iconColor: "text-teal-600" },
};

async function getEvents(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : undefined;
    const startDate = typeof params.startDate === 'string' ? params.startDate : undefined;
    const endDate = typeof params.endDate === 'string' ? params.endDate : undefined;
    const type = typeof params.type === 'string' ? params.type : undefined;
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page) || 1) : 1;

    const where: Prisma.SalesChannelWhereInput = {
        AND: []
    };

    if (type) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({ type });
    }

    if (q) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
            ]
        });
    }

    if (startDate) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            endDate: { gte: new Date(startDate) }
        });
    }

    if (endDate) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            startDate: { lte: new Date(endDate) }
        });
    }

    const [events, totalCount] = await Promise.all([
        db.salesChannel.findMany({
            where,
            orderBy: [{ startDate: 'desc' }],
            skip: (page - 1) * ITEMS_PER_PAGE,
            take: ITEMS_PER_PAGE,
            include: {
                _count: {
                    select: { sales: true, staff: true },
                },
                sales: {
                    where: { status: 'active' },
                    select: { totalAmount: true },
                },
            },
        }),
        db.salesChannel.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    return { events, totalCount, totalPages, currentPage: page };
}

function fmt(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { events, totalCount, totalPages, currentPage } = await getEvents(searchParams);
    const params = await searchParams;

    // Summary stats
    const totalChannels = totalCount;
    const activeChannels = events.filter(e => ['active', 'selling', 'approved'].includes(e.status)).length;
    const totalSales = events.reduce((sum, e) => sum + e.sales.reduce((s, sale) => s + Number(sale.totalAmount), 0), 0);

    // Build pagination URL helper
    const buildPageUrl = (page: number) => {
        const p = new URLSearchParams();
        if (params.q) p.set('q', String(params.q));
        if (params.type) p.set('type', String(params.type));
        if (params.startDate) p.set('startDate', String(params.startDate));
        if (params.endDate) p.set('endDate', String(params.endDate));
        if (page > 1) p.set('page', String(page));
        const qs = p.toString();
        return `/channels${qs ? `?${qs}` : ''}`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeader
                icon={Store}
                title="ช่องทางการขาย"
                subtitle="จัดการข้อมูล Event/สาขา/ออกบูธ"
                actions={
                    <Link
                        href="/channels/create"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-teal-200/50 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        สร้าง Event ใหม่
                    </Link>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">ช่องทางทั้งหมด</p>
                            <p className="text-3xl font-bold mt-1">{totalChannels}</p>
                            <p className="text-xs text-white/60 mt-1">ช่องทาง</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-teal-400/20">
                            <Store className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">กำลังเปิดขาย</p>
                            <p className="text-3xl font-bold mt-1">{activeChannels}</p>
                            <p className="text-xs text-white/60 mt-1">ช่องทาง</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-emerald-400/20">
                            <CalendarDays className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">ยอดขายรวม</p>
                            <p className="text-3xl font-bold mt-1">฿{fmt(totalSales)}</p>
                            <p className="text-xs text-white/60 mt-1">จากทุกช่องทาง</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-blue-400/20">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>
            </div>

            <EventFilters />

            {/* Channel List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Store}
                            message="ยังไม่มี Event"
                            description="เริ่มสร้าง Event แรกของคุณได้เลย"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {events.map((event) => {
                            const status = STATUS_CONFIG[event.status] || { label: event.status, bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" };
                            const typeConf = TYPE_CONFIG[event.type] || TYPE_CONFIG.EVENT;
                            const TypeIcon = typeConf.icon;
                            const channelTotalSales = event.sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);

                            return (
                                <Link
                                    key={event.id}
                                    href={`/channels/${event.id}`}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors group"
                                >
                                    {/* Type Icon */}
                                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${typeConf.bg}`}>
                                        <TypeIcon className={`h-5 w-5 ${typeConf.iconColor}`} />
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                                {event.name}
                                            </h3>
                                            <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                {event.code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {event.location || '—'}
                                            </span>
                                            <span className="text-slate-200">·</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {event.startDate ? format(new Date(event.startDate), "d MMM", { locale: th }) : '—'} – {event.endDate ? format(new Date(event.endDate), "d MMM yy", { locale: th }) : '—'}
                                            </span>
                                            {event._count.staff > 0 && (
                                                <>
                                                    <span className="text-slate-200">·</span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {event._count.staff} คน
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sales Amount */}
                                    <div className="hidden sm:block text-right flex-shrink-0 mr-2">
                                        {channelTotalSales > 0 ? (
                                            <>
                                                <p className="text-sm font-bold text-slate-800">฿{fmt(channelTotalSales)}</p>
                                                <p className="text-[11px] text-slate-400">{event._count.sales} บิล</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-300">—</p>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text} border ${status.border}`}>
                                        {status.label}
                                    </span>

                                    {/* Arrow */}
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} จาก {totalCount} รายการ
                    </p>
                    <div className="flex items-center gap-1">
                        {currentPage > 1 && (
                            <Link
                                href={buildPageUrl(currentPage - 1)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
                            </Link>
                        )}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                            .map((p, idx, arr) => (
                                <span key={p}>
                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                        <span className="px-1 text-slate-300">…</span>
                                    )}
                                    <Link
                                        href={buildPageUrl(p)}
                                        className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-lg transition-colors ${p === currentPage
                                            ? 'bg-teal-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </Link>
                                </span>
                            ))}
                        {currentPage < totalPages && (
                            <Link
                                href={buildPageUrl(currentPage + 1)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                ถัดไป <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
