"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Plus, Package, Clock, CheckCircle, Truck, Eye, RefreshCw, MapPin, Calendar, Filter } from "lucide-react";
import Link from "next/link";

interface Channel {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface StockRequest {
    id: string;
    channelId: string;
    status: string;
    requestedTotalQuantity: number;
    notes: string | null;
    createdAt: string;
    channel: Channel;
}

interface Props {
    requests: StockRequest[];
    channels: Channel[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "แบบร่าง", color: "bg-slate-100 text-slate-600", icon: Clock },
    submitted: { label: "รออนุมัติ", color: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "อนุมัติแล้ว", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
    allocated: { label: "จัดสรรแล้ว", color: "bg-teal-100 text-teal-700", icon: Package },
    packed: { label: "แพ็คแล้ว", color: "bg-purple-100 text-purple-700", icon: Package },
    shipped: { label: "จัดส่งแล้ว", color: "bg-cyan-100 text-cyan-700", icon: Truck },
    received: { label: "รับแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-600", icon: Clock },
};

export function RefillListClient({ requests, channels }: Props) {
    const [channelFilter, setChannelFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const filteredRequests = useMemo(() => {
        return requests.filter((r) => {
            if (channelFilter && r.channelId !== channelFilter) return false;
            if (statusFilter && r.status !== statusFilter) return false;
            if (dateFrom) {
                const from = new Date(dateFrom);
                from.setHours(0, 0, 0, 0);
                if (new Date(r.createdAt) < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (new Date(r.createdAt) > to) return false;
            }
            return true;
        });
    }, [requests, channelFilter, statusFilter, dateFrom, dateTo]);

    // Summary counts
    const pendingCount = requests.filter((r) => ["draft", "submitted"].includes(r.status)).length;
    const inProgressCount = requests.filter((r) =>
        ["approved", "allocated", "packed", "shipped"].includes(r.status)
    ).length;
    const completedCount = requests.filter((r) => r.status === "received").length;

    const clearFilters = () => {
        setChannelFilter("");
        setStatusFilter("");
        setDateFrom("");
        setDateTo("");
    };

    const hasFilters = channelFilter || statusFilter || dateFrom || dateTo;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-teal-600" />
                        คำขอสินค้าเพิ่ม (Top-Up)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        รวมทั้งหมด {requests.length} รายการ
                    </p>
                </div>
                <Link
                    href="/pc/refill/new"
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" /> ขอสินค้าเพิ่ม
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">ทั้งหมด</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                    <p className="text-xs text-amber-600 uppercase tracking-wider">รออนุมัติ</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                    <p className="text-xs text-blue-600 uppercase tracking-wider">กำลังดำเนินการ</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{inProgressCount}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                    <p className="text-xs text-emerald-600 uppercase tracking-wider">รับแล้ว</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">ตัวกรอง</span>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                            ล้างทั้งหมด
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Channel filter */}
                    <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                    >
                        <option value="">ทุก Event</option>
                        {channels.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                                {ch.name} ({ch.code})
                            </option>
                        ))}
                    </select>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                    >
                        <option value="">ทุกสถานะ</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>
                                {cfg.label}
                            </option>
                        ))}
                    </select>

                    {/* Date from */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                            placeholder="ตั้งแต่"
                        />
                    </div>

                    {/* Date to */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-slate-50 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                            placeholder="ถึง"
                        />
                    </div>
                </div>
                {hasFilters && (
                    <p className="text-xs text-slate-400 mt-2">
                        แสดง {filteredRequests.length} จาก {requests.length} รายการ
                    </p>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    จำนวน
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    วันที่ขอ
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    สถานะ
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    หมายเหตุ
                                </th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-slate-400">ไม่มีคำขอ{hasFilters ? "ที่ตรงตามเงื่อนไข" : ""}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => {
                                    const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.draft;
                                    const StatusIcon = config.icon;
                                    return (
                                        <tr
                                            key={req.id}
                                            className="hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">
                                                    {req.channel.name}
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {req.channel.location}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-semibold text-slate-900">
                                                    {req.requestedTotalQuantity.toLocaleString()}
                                                </span>
                                                <span className="text-slate-400 ml-1">ชิ้น</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="text-sm text-slate-900">
                                                    {format(new Date(req.createdAt), "d MMM yy", {
                                                        locale: th,
                                                    })}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {format(new Date(req.createdAt), "HH:mm น.")}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {config.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {req.notes ? (
                                                    <span className="text-xs text-slate-500 line-clamp-1">
                                                        {req.notes}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/pc/refill/${req.id}`}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors inline-flex"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
