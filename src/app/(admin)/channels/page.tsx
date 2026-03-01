import { db } from "@/lib/db";
import { format } from "date-fns";
import { Calendar, MapPin, Plus, Store } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/shared";

import { EventFilters } from "./EventFilters";
import { Prisma } from "@prisma/client";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: "แบบร่าง", bg: "bg-slate-100", text: "text-slate-600" },
    approved: { label: "อนุมัติ", bg: "bg-emerald-50", text: "text-emerald-700" },
    active: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700" },
    selling: { label: "กำลังขาย", bg: "bg-blue-50", text: "text-blue-700" },
    packing: { label: "กำลังแพ็ค", bg: "bg-amber-50", text: "text-amber-700" },
    shipped: { label: "จัดส่งแล้ว", bg: "bg-violet-50", text: "text-violet-700" },
    received: { label: "รับสินค้าแล้ว", bg: "bg-teal-50", text: "text-teal-700" },
    returned: { label: "คืนสินค้าแล้ว", bg: "bg-orange-50", text: "text-orange-700" },
    closed: { label: "ปิดงาน", bg: "bg-slate-100", text: "text-slate-500" },
    payment_approved: { label: "อนุมัติจ่าย", bg: "bg-emerald-50", text: "text-emerald-700" },
};

async function getEvents(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : undefined;
    const startDate = typeof params.startDate === 'string' ? params.startDate : undefined;
    const endDate = typeof params.endDate === 'string' ? params.endDate : undefined;
    const type = typeof params.type === 'string' ? params.type : undefined;

    const where: Prisma.SalesChannelWhereInput = {
        AND: []
    };

    // Filter by type (EVENT / BRANCH)
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

    const events = await db.salesChannel.findMany({
        where,
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });
    return events;
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const events = await getEvents(searchParams);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">ช่องทางการขาย</h2>
                    <p className="text-sm text-slate-500 mt-0.5">จัดการข้อมูล Event/สาขา/ออกบูธ</p>
                </div>
                <Link
                    href="/channels/create"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-teal-200/50 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    สร้าง Event ใหม่
                </Link>
            </div>

            <EventFilters />

            {/* Event Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => {
                    const status = STATUS_CONFIG[event.status] || { label: event.status, bg: "bg-slate-100", text: "text-slate-600" };

                    return (
                        <Link
                            key={event.id}
                            href={`/channels/${event.id}`}
                            className="group block rounded-2xl bg-white border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-200 transition-all duration-200"
                        >
                            {/* Top row: Status + Code */}
                            <div className="flex items-center justify-between mb-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}>
                                    {status.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">{event.code}</span>
                            </div>

                            {/* Event name */}
                            <h3 className="text-base font-bold text-slate-900 mb-3 truncate group-hover:text-teal-700 transition-colors">
                                {event.name}
                            </h3>

                            {/* Details */}
                            <div className="space-y-1.5 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{event.location || '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                    <span>
                                        {event.startDate ? format(new Date(event.startDate), "d MMM") : '—'} – {event.endDate ? format(new Date(event.endDate), "d MMM yyyy") : '—'}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {events.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Store}
                            message="ยังไม่มี Event"
                            description="เริ่มสร้าง Event แรกของคุณได้เลย"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
