import { db } from "@/lib/db";
import { fmt } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar, MapPin, Receipt, ArrowRight, TrendingUp, Store, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";
import { getChannelStatus } from "@/config/status";
import { Prisma } from "@prisma/client";
import { ExpensesFilters } from "./ExpensesFilters";

const ITEMS_PER_PAGE = 20;





async function getData(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : undefined;
    const startDate = typeof params.startDate === 'string' ? params.startDate : undefined;
    const endDate = typeof params.endDate === 'string' ? params.endDate : undefined;
    const page = typeof params.page === 'string' ? Math.max(1, parseInt(params.page) || 1) : 1;

    const where: Prisma.SalesChannelWhereInput = { AND: [] };

    if (q) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
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
            orderBy: { startDate: 'desc' },
            skip: (page - 1) * ITEMS_PER_PAGE,
            take: ITEMS_PER_PAGE,
            include: {
                _count: { select: { expenses: true } },
                expenses: {
                    select: { amount: true, category: true },
                },
            },
        }),
        db.salesChannel.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    return { events, totalCount, totalPages, currentPage: page };
}

export default async function ExpensesEventListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { events, totalCount, totalPages, currentPage } = await getData(searchParams);
    const params = await searchParams;

    // Summary
    const totalExpenseAmount = events.reduce((sum, e) => sum + e.expenses.reduce((s, exp) => s + Number(exp.amount), 0), 0);
    const totalExpenseCount = events.reduce((sum, e) => sum + e._count.expenses, 0);
    const channelsWithExpenses = events.filter(e => e._count.expenses > 0).length;

    const buildPageUrl = (page: number) => {
        const p = new URLSearchParams();
        if (params.q) p.set('q', String(params.q));
        if (params.startDate) p.set('startDate', String(params.startDate));
        if (params.endDate) p.set('endDate', String(params.endDate));
        if (page > 1) p.set('page', String(page));
        const qs = p.toString();
        return `/channels/expenses${qs ? `?${qs}` : ''}`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeader
                icon={Receipt}
                title="บันทึกค่าใช้จ่าย"
                subtitle="เลือก Event ที่ต้องการจัดการค่าใช้จ่ายและค่าตอบแทน"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">ค่าใช้จ่ายรวม</p>
                            <p className="text-3xl font-bold mt-1">฿{fmt(totalExpenseAmount)}</p>
                            <p className="text-xs text-white/60 mt-1">{fmt(totalExpenseCount)} รายการ</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-rose-400/20">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">ช่องทางทั้งหมด</p>
                            <p className="text-3xl font-bold mt-1">{totalCount}</p>
                            <p className="text-xs text-white/60 mt-1">ช่องทาง</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-teal-400/20">
                            <Store className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-white/80">มีค่าใช้จ่าย</p>
                            <p className="text-3xl font-bold mt-1">{channelsWithExpenses}</p>
                            <p className="text-xs text-white/60 mt-1">ช่องทาง</p>
                        </div>
                        <div className="rounded-xl p-2.5 bg-amber-400/20">
                            <Receipt className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                </div>
            </div>

            {/* Filters */}
            <ExpensesFilters />

            {/* Channel List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {events.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={Receipt}
                            message="ไม่พบรายการ"
                            description="ลองเปลี่ยนตัวกรองหรือค้นหาใหม่"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {events.map((event) => {
                            const status = getChannelStatus(event.status);
                            const channelExpenses = event.expenses.reduce((s, exp) => s + Number(exp.amount), 0);

                            return (
                                <Link
                                    key={event.id}
                                    href={`/channels/${event.id}/expenses`}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors group"
                                >
                                    {/* Icon */}
                                    <div className="flex-shrink-0 p-2.5 rounded-xl bg-rose-50">
                                        <Receipt className="h-5 w-5 text-rose-600" />
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
                                        </div>
                                    </div>

                                    {/* Expense Amount */}
                                    <div className="hidden sm:block text-right flex-shrink-0 mr-2">
                                        {channelExpenses > 0 ? (
                                            <>
                                                <p className="text-sm font-bold text-rose-600">฿{fmt(channelExpenses)}</p>
                                                <p className="text-[11px] text-slate-400">{event._count.expenses} รายการ</p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-300">ยังไม่มี</p>
                                        )}
                                    </div>

                                    {/* Status Badge */}
                                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${status.bg} ${status.text} border ${status.border}`}>
                                        {status.label}
                                    </span>

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
