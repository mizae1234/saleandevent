"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Plus, Package, Clock, CheckCircle, Truck, Eye, RefreshCw, MapPin } from "lucide-react";
import Link from "next/link";

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface Product {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
}

interface RequestItem {
    id: string;
    barcode: string;
    quantity: number;
    packedQuantity: number | null;
    receivedQuantity: number | null;
    product: Product;
}

interface StockRequest {
    id: string;
    eventId: string;
    status: string;
    createdAt: Date;
    approvedAt: Date | null;
    shippedAt: Date | null;
    receivedAt: Date | null;
    event: Event;
    items: RequestItem[];
}

interface Props {
    requests: StockRequest[];
    events: Event[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "รออนุมัติ", color: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "อนุมัติแล้ว", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
    packing: { label: "กำลังแพ็ค", color: "bg-purple-100 text-purple-700", icon: Package },
    shipped: { label: "จัดส่งแล้ว", color: "bg-cyan-100 text-cyan-700", icon: Truck },
    received: { label: "รับของแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

export function RefillListClient({ requests, events }: Props) {
    const [eventFilter, setEventFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    // Filter requests
    const filteredRequests = requests.filter(r => {
        if (eventFilter && r.eventId !== eventFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        return true;
    });

    // Count by status
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const inProgressCount = requests.filter(r => ['approved', 'packing', 'shipped'].includes(r.status)).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-emerald-600" />
                        เบิกของเพิ่ม
                    </h1>
                    <p className="text-slate-500">ขอเบิกสินค้าเพิ่มเติมสำหรับ Event ที่กำลังดำเนินการ</p>
                </div>
                <Link
                    href="/pc/refill/new"
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    ขอเบิกเพิ่ม
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-slate-500">คำขอทั้งหมด</p>
                    <p className="text-2xl font-bold text-slate-900">{requests.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm bg-gradient-to-r from-amber-50 to-white">
                    <p className="text-sm text-slate-500">รออนุมัติ</p>
                    <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm bg-gradient-to-r from-blue-50 to-white">
                    <p className="text-sm text-slate-500">กำลังดำเนินการ</p>
                    <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
                <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">ทุก Event</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="pending">รออนุมัติ</option>
                    <option value="approved">อนุมัติแล้ว</option>
                    <option value="packing">กำลังแพ็ค</option>
                    <option value="shipped">จัดส่งแล้ว</option>
                    <option value="received">รับของแล้ว</option>
                </select>
                <span className="text-sm text-slate-500">
                    {filteredRequests.length} รายการ
                </span>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#EFF4FA] text-slate-700">
                            <th className="text-left px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-l-0">Event</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">วันที่ขอ</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">รายการ</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">สถานะ</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-r-0"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-12 text-slate-400 border border-slate-200">
                                    <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    ไม่มีคำขอเบิก
                                </td>
                            </tr>
                        ) : (
                            filteredRequests.map((request) => {
                                const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                                const StatusIcon = config.icon;
                                const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);

                                return (
                                    <tr key={request.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 border border-slate-200 border-l-0">
                                            <div className="font-medium text-slate-900">{request.event.name}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {request.event.location}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center border border-slate-200">
                                            <div className="text-sm text-slate-900">
                                                {format(new Date(request.createdAt), 'd MMM yyyy', { locale: th })}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {format(new Date(request.createdAt), 'HH:mm น.')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center border border-slate-200">
                                            <span className="text-sm font-medium text-slate-600">
                                                {request.items.length} รายการ
                                            </span>
                                            <div className="text-xs text-slate-400">{totalItems} ชิ้น</div>
                                        </td>
                                        <td className="px-4 py-3 text-center border border-slate-200">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {config.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center border border-slate-200 border-r-0">
                                            <Link
                                                href={`/pc/refill/${request.id}`}
                                                className="text-slate-400 hover:text-emerald-600 transition-colors"
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
    );
}
