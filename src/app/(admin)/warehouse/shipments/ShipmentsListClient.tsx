"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, Truck, ArrowRight, History, CheckCircle2, Clock, Search } from "lucide-react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shared";

interface ShipmentReq {
    id: string;
    channelId: string;
    status: string;
    requestType: string;
    totalPacked: number;
    channel: { id: string; name: string; code: string; location?: string };
    shipment: { provider: string; trackingNumber: string | null; shippedAt: string | null } | null;
}

function matchSearch(req: ShipmentReq, s: string) {
    return req.channel.name.toLowerCase().includes(s) ||
        req.channel.code.toLowerCase().includes(s) ||
        (req.channel.location || '').toLowerCase().includes(s) ||
        (req.shipment?.trackingNumber || '').toLowerCase().includes(s);
}

export function ShipmentsListClient({ packed, shipped, received }: { packed: ShipmentReq[]; shipped: ShipmentReq[]; received: ShipmentReq[] }) {
    const [search, setSearch] = useState('');
    const s = search.toLowerCase();

    const filteredPacked = useMemo(() => s ? packed.filter(r => matchSearch(r, s)) : packed, [packed, s]);
    const filteredShipped = useMemo(() => s ? shipped.filter(r => matchSearch(r, s)) : shipped, [shipped, s]);
    const filteredReceived = useMemo(() => s ? received.filter(r => matchSearch(r, s)) : received, [received, s]);

    const total = packed.length + shipped.length + received.length;
    const filteredTotal = filteredPacked.length + filteredShipped.length + filteredReceived.length;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                icon={Truck}
                title="จัดส่งสินค้า"
                subtitle="จัดการและติดตามการจัดส่งสินค้า"
            />

            {/* Search */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event / สาขา / เลขพัสดุ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                    />
                </div>
                {search && (
                    <p className="text-xs text-slate-400 mt-2">พบ {filteredTotal} จาก {total} รายการ</p>
                )}
            </div>

            {/* Ready to Ship */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        พร้อมจัดส่ง
                        <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{filteredPacked.length}</span>
                    </h2>
                </div>
                {filteredPacked.length === 0 ? (
                    <div className="p-6">
                        <EmptyState icon={Truck} message="ไม่มีรายการรอจัดส่ง" />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredPacked.map(req => (
                            <Link key={req.id} href={`/channels/${req.id}/shipping`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-blue-50">
                                    <Package className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{req.channel.name}</h3>
                                        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${req.requestType === 'INITIAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                            {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.channel.location || '—'}</span>
                                        <span className="hidden sm:inline text-slate-200">·</span>
                                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {req.totalPacked.toLocaleString()} ชิ้น</span>
                                    </div>
                                </div>
                                <span className="flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">พร้อมจัดส่ง</span>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* In Transit */}
            {filteredShipped.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Truck className="h-4 w-4 text-violet-500" />
                            กำลังจัดส่ง
                            <span className="ml-auto text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{filteredShipped.length}</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {filteredShipped.map(req => (
                            <Link key={req.id} href={`/channels/${req.channelId}`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-violet-50">
                                    <Truck className="h-5 w-5 text-violet-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{req.channel.name}</h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{req.channel.code}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        {req.shipment && (
                                            <span className="flex items-center gap-1">
                                                <Truck className="h-3 w-3" /> {req.shipment.provider}
                                                {req.shipment.trackingNumber && <span className="text-blue-600 font-mono">#{req.shipment.trackingNumber}</span>}
                                            </span>
                                        )}
                                        <span className="hidden sm:inline text-slate-200">·</span>
                                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {req.totalPacked.toLocaleString()} ชิ้น</span>
                                        {req.shipment?.shippedAt && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(req.shipment.shippedAt), 'd MMM yy', { locale: th })}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                                    <Truck className="h-3 w-3" /> กำลังส่ง
                                </span>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            {filteredReceived.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <History className="h-4 w-4 text-emerald-500" />
                            ประวัติการจัดส่ง
                            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{filteredReceived.length}</span>
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {filteredReceived.map(req => (
                            <Link key={req.id} href={`/channels/${req.channelId}`} className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group">
                                <div className="hidden sm:block flex-shrink-0 p-2.5 rounded-xl bg-emerald-50">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-teal-700 transition-colors">{req.channel.name}</h3>
                                        <span className="flex-shrink-0 text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{req.channel.code}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        {req.shipment && (
                                            <span className="flex items-center gap-1">
                                                <Truck className="h-3 w-3" /> {req.shipment.provider}
                                                {req.shipment.trackingNumber && ` · ${req.shipment.trackingNumber}`}
                                            </span>
                                        )}
                                        <span className="hidden sm:inline text-slate-200">·</span>
                                        <span>{req.totalPacked.toLocaleString()} ชิ้น</span>
                                        {req.shipment?.shippedAt && (
                                            <>
                                                <span className="hidden sm:inline text-slate-200">·</span>
                                                <span>{format(new Date(req.shipment.shippedAt), 'd MMM yy', { locale: th })}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <span className="flex-shrink-0 hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">✓ รับแล้ว</span>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
