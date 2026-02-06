"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Check, X, Package, RefreshCw, MapPin, Eye, ChevronDown, ChevronUp, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveRefillRequest, rejectRefillRequest } from "@/actions/refill-actions";

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
    product: Product;
}

interface StockRequest {
    id: string;
    eventId: string;
    status: string;
    createdAt: Date;
    event: Event;
    items: RequestItem[];
}

interface Props {
    requests: StockRequest[];
}

export function RefillApprovalClient({ requests }: Props) {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await approveRefillRequest(id);
            router.refresh();
        } catch (error) {
            console.error("Error approving:", error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("ยืนยันปฏิเสธคำขอนี้?")) return;
        setProcessingId(id);
        try {
            await rejectRefillRequest(id);
            router.refresh();
        } catch (error) {
            console.error("Error rejecting:", error);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="h-6 w-6 text-amber-500" />
                        อนุมัติคำขอเบิกของเพิ่ม
                    </h1>
                    <p className="text-slate-500">ตรวจสอบและอนุมัติคำขอเบิกสินค้าจากหน้าร้าน</p>
                </div>
                <Link
                    href="/events/approvals"
                    className="text-sm text-slate-500 hover:text-slate-700"
                >
                    ← กลับหน้าอนุมัติทั้งหมด
                </Link>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 shadow-sm border border-amber-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 text-white rounded-lg">
                        <RefreshCw className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-amber-700">{requests.length}</p>
                        <p className="text-sm text-amber-600">คำขอรออนุมัติ</p>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                        <Check className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">ไม่มีคำขอรออนุมัติ</p>
                    <p className="text-sm text-slate-400 mt-1">คำขอเบิกทั้งหมดได้รับการดำเนินการแล้ว</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map((request) => {
                        const isExpanded = expandedId === request.id;
                        const isProcessing = processingId === request.id;
                        const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);

                        return (
                            <div key={request.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                                {/* Header Row */}
                                <div className="p-4 flex items-center gap-4">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : request.id)}
                                        className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{request.event.name}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {request.event.location}
                                        </p>
                                    </div>

                                    <div className="text-center px-4">
                                        <p className="text-lg font-bold text-slate-900">{request.items.length}</p>
                                        <p className="text-xs text-slate-400">รายการ</p>
                                    </div>

                                    <div className="text-center px-4">
                                        <p className="text-lg font-bold text-slate-900">{totalItems}</p>
                                        <p className="text-xs text-slate-400">ชิ้น</p>
                                    </div>

                                    <div className="text-sm text-slate-500">
                                        {format(new Date(request.createdAt), 'd MMM yy, HH:mm', { locale: th })}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            disabled={isProcessing}
                                            className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="text-sm font-medium">ปฏิเสธ</span>
                                        </button>
                                        <button
                                            onClick={() => handleApprove(request.id)}
                                            disabled={isProcessing}
                                            className="px-4 py-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <Check className="h-4 w-4" />
                                            <span className="text-sm font-medium">
                                                {isProcessing ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Items */}
                                {isExpanded && (
                                    <div className="border-t border-slate-200 bg-slate-50 p-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-xs text-slate-500">
                                                    <th className="text-left py-2">สินค้า</th>
                                                    <th className="text-center py-2">ไซส์</th>
                                                    <th className="text-center py-2">จำนวน</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {request.items.map((item) => (
                                                    <tr key={item.id} className="border-t border-slate-200">
                                                        <td className="py-2">
                                                            <p className="font-medium text-slate-900">{item.product.name}</p>
                                                            <p className="text-xs text-slate-400">{item.product.code || item.barcode}</p>
                                                        </td>
                                                        <td className="py-2 text-center text-slate-600">
                                                            {item.product.size || '-'}
                                                        </td>
                                                        <td className="py-2 text-center font-medium text-slate-900">
                                                            {item.quantity}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
