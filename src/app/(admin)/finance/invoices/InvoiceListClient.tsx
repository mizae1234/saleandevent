"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { FileText, Search, ArrowRight, MapPin, Calendar, User, Hash } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface InvoiceChannel {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    invoiceCount: number;
    customerName: string | null;
}

export function InvoiceListClient({ channels }: { channels: InvoiceChannel[] }) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search) return channels;
        const s = search.toLowerCase();
        return channels.filter(ch =>
            ch.name.toLowerCase().includes(s) ||
            ch.code.toLowerCase().includes(s) ||
            ch.location.toLowerCase().includes(s) ||
            (ch.customerName || '').toLowerCase().includes(s)
        );
    }, [channels, search]);

    const totalInvoices = channels.reduce((s, c) => s + c.invoiceCount, 0);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={FileText}
                title="ใบแจ้งหนี้ (Invoice)"
                subtitle="เลือก Event เพื่อจัดการใบแจ้งหนี้"
            />

            {/* Search */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event / สาขา / ลูกค้า..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                    />
                </div>
                {search && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filtered.length} จาก {channels.length} ช่องทาง</p>
                )}
            </div>

            {/* Channel List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-teal-600" />
                        ช่องทางขาย
                        <span className="ml-auto text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                            {filtered.length} ช่องทาง · {totalInvoices} Invoice
                        </span>
                    </h2>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-8">
                        <EmptyState
                            icon={FileText}
                            message={search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มี Event ที่มีการจัดส่งสินค้า"}
                            description={!search ? "เมื่อมีการจัดส่งสินค้าไปยัง Event แล้ว จะแสดงที่นี่" : undefined}
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(ch => (
                            <Link
                                key={ch.id}
                                href={`/finance/invoices/${ch.id}`}
                                className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                            >
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-teal-50">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                            {ch.name}
                                        </h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                            {ch.code}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> {ch.location}
                                        </span>
                                        {ch.customerName && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" /> {ch.customerName}
                                                </span>
                                            </>
                                        )}
                                        {ch.startDate && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(ch.startDate), 'd MMM', { locale: th })}
                                                    {ch.endDate && ` – ${format(new Date(ch.endDate), 'd MMM yy', { locale: th })}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                                        <FileText className="h-3 w-3" /> {ch.invoiceCount} Invoice
                                    </span>
                                </div>

                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
