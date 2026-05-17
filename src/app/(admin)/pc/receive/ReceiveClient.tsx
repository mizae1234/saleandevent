"use client";

import { useState, useMemo } from "react";
import { Package, Truck, ArrowRight, History, CheckCircle2, Clock, Hash, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";
import { format } from "date-fns";
import { th } from "date-fns/locale";

interface ShippedRequest {
    id: string;
    requestType: string;
    channel: { id: string; name: string; code: string };
    shipment: { provider: string | null; trackingNumber: string | null } | null;
    totalPacked: number;
    updatedAt: string;
}

interface ReceivedRequest {
    id: string;
    requestType: string;
    channel: { id: string; name: string; code: string };
    shipment: { provider: string | null; trackingNumber: string | null } | null;
    receivedTotalQty: number;
    receivedAt: string | null;
    receivingId: string | null;
    updatedAt: string;
}

interface Props {
    shippedRequests: ShippedRequest[];
    receivedRequests: ReceivedRequest[];
    totalReceived: number;
}

const PAGE_SIZE = 15;

export function ReceiveClient({ shippedRequests, receivedRequests, totalReceived }: Props) {
    const [search, setSearch] = useState("");
    const [historyPage, setHistoryPage] = useState(1);

    // Filter shipped requests
    const filteredShipped = useMemo(() => {
        if (!search) return shippedRequests;
        const q = search.toLowerCase();
        return shippedRequests.filter(r =>
            r.channel.name.toLowerCase().includes(q) ||
            r.channel.code.toLowerCase().includes(q)
        );
    }, [shippedRequests, search]);

    // Filter + paginate received requests
    const filteredReceived = useMemo(() => {
        if (!search) return receivedRequests;
        const q = search.toLowerCase();
        return receivedRequests.filter(r =>
            r.channel.name.toLowerCase().includes(q) ||
            r.channel.code.toLowerCase().includes(q)
        );
    }, [receivedRequests, search]);

    const totalHistoryPages = Math.ceil(filteredReceived.length / PAGE_SIZE);
    const paginatedReceived = filteredReceived.slice(
        (historyPage - 1) * PAGE_SIZE,
        historyPage * PAGE_SIZE
    );

    // Reset page when search changes
    const handleSearch = (val: string) => {
        setSearch(val);
        setHistoryPage(1);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Package}
                title="รับสินค้าเข้า"
                subtitle={`${shippedRequests.length} รายการรอรับ`}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">รอรับสินค้า</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{shippedRequests.length}</p>
                            <p className="text-xs text-white/60 mt-0.5">รายการ</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-amber-400/20">
                            <Truck className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 text-white shadow-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-white/80">รับแล้ว</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1">{totalReceived}</p>
                            <p className="text-xs text-white/60 mt-0.5">รายการ</p>
                        </div>
                        <div className="hidden sm:block rounded-xl p-2.5 bg-emerald-400/20">
                            <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-white/5" />
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="ค้นหาช่องทาง (ชื่อ, รหัส)..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                />
            </div>

            {/* Pending Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        สินค้ารอรับ
                        <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{filteredShipped.length}</span>
                    </h2>
                </div>

                {filteredShipped.length === 0 ? (
                    <div className="p-8">
                        <EmptyState icon={Package} message="ไม่มีสินค้ารอรับ" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredShipped.map(req => (
                            <Link key={req.id} href={`/pc/receive/${req.id}`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-amber-50">
                                    <Truck className="h-5 w-5 text-amber-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                            {req.channel.name}
                                        </h3>
                                        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                            {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-3 w-3" /> {req.channel.code}
                                        </span>
                                        {req.shipment && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Truck className="h-3 w-3" />
                                                    {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <p className="text-sm font-bold text-slate-800">{req.totalPacked.toLocaleString()}</p>
                                    <p className="text-[11px] text-slate-400">ชิ้น</p>
                                </div>

                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* History Section with Pagination */}
            {filteredReceived.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <History className="h-4 w-4 text-emerald-500" />
                            ประวัติการรับสินค้า
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{filteredReceived.length}</span>
                        </h2>
                        {totalHistoryPages > 1 && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage === 1}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="px-2 font-medium">{historyPage} / {totalHistoryPages}</span>
                                <button
                                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                    disabled={historyPage === totalHistoryPages}
                                    className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="divide-y divide-slate-50">
                        {paginatedReceived.map(req => (
                            <Link
                                key={req.id}
                                href={`/pc/receive/history/${req.receivingId || req.id}`}
                                className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group"
                            >
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-emerald-50">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                                            {req.channel.name}
                                        </h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                            {req.channel.code}
                                        </span>
                                        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                            {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                            รับแล้ว {req.receivedTotalQty} ชิ้น
                                        </span>
                                        {req.shipment && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1">
                                                    <Truck className="h-3 w-3" />
                                                    {req.shipment.provider} {req.shipment.trackingNumber && `· ${req.shipment.trackingNumber}`}
                                                </span>
                                            </>
                                        )}
                                        {req.receivedAt && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span>{format(new Date(req.receivedAt), 'd MMM yy HH:mm', { locale: th })}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>

                    {/* Bottom Pagination */}
                    {totalHistoryPages > 1 && (
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                            <span>แสดง {(historyPage - 1) * PAGE_SIZE + 1}–{Math.min(historyPage * PAGE_SIZE, filteredReceived.length)} จาก {filteredReceived.length} รายการ</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                    disabled={historyPage === 1}
                                    className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                >
                                    ก่อนหน้า
                                </button>
                                <button
                                    onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                    disabled={historyPage === totalHistoryPages}
                                    className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
