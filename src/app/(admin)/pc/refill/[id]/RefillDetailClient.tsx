"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, Pencil, Save, X, MapPin, FileText, Hash } from "lucide-react";
import Link from "next/link";
import { updateStockRequest, approveStockRequest, rejectStockRequest } from "@/actions/stock-request";

interface Channel {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface Allocation {
    id: string;
    barcode: string;
    size: string | null;
    packedQuantity: number;
    price: number;
    product: {
        name: string;
        code: string | null;
        color: string | null;
        size: string | null;
    } | null;
}

interface StockRequestData {
    id: string;
    channelId: string;
    requestType: string;
    requestedTotalQuantity: number;
    status: string;
    notes: string | null;
    createdAt: string;
    approvedAt: string | null;
    channel: Channel;
    allocations: Allocation[];
}

interface Props {
    request: StockRequestData;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
    draft: { label: "แบบร่าง", bg: "bg-slate-100 text-slate-600", icon: FileText },
    submitted: { label: "ส่งคำขอแล้ว", bg: "bg-amber-100 text-amber-700", icon: Clock },
    pending: { label: "รออนุมัติ", bg: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "อนุมัติแล้ว", bg: "bg-blue-100 text-blue-700", icon: CheckCircle },
    allocated: { label: "จัดสรรแล้ว", bg: "bg-indigo-100 text-indigo-700", icon: Package },
    packed: { label: "แพ็คแล้ว", bg: "bg-purple-100 text-purple-700", icon: Package },
    shipped: { label: "จัดส่งแล้ว", bg: "bg-cyan-100 text-cyan-700", icon: Truck },
    received: { label: "รับของแล้ว", bg: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    cancelled: { label: "ยกเลิก", bg: "bg-red-100 text-red-600", icon: X },
};

export function RefillDetailClient({ request }: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [qty, setQty] = useState(String(request.requestedTotalQuantity));
    const [notes, setNotes] = useState(request.notes || "");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.draft;
    const StatusIcon = statusConfig.icon;
    const canEdit = !['shipped', 'received', 'cancelled'].includes(request.status);

    const handleSave = () => {
        const parsedQty = parseInt(qty);
        if (isNaN(parsedQty) || parsedQty <= 0) {
            setError("กรุณาระบุจำนวนที่ถูกต้อง");
            return;
        }
        setError(null);
        startTransition(async () => {
            try {
                await updateStockRequest(request.id, {
                    requestedTotalQuantity: parsedQty,
                    notes: notes || null,
                });
                setIsEditing(false);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            }
        });
    };

    const handleApprove = () => {
        startTransition(async () => {
            try {
                await approveStockRequest(request.id);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            }
        });
    };

    const handleReject = () => {
        const reason = prompt("ระบุเหตุผลที่ปฏิเสธ (ไม่บังคับ):");
        if (reason === null) return; // cancelled
        startTransition(async () => {
            try {
                await rejectStockRequest(request.id, reason || undefined);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/refill"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">รายละเอียดคำขอเบิก</h1>
                    <p className="text-sm text-slate-500">{request.channel.name} — {request.channel.code}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                </span>
            </div>

            {/* Info Card */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">ข้อมูลคำขอ</h3>
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            แก้ไข
                        </button>
                    )}
                </div>

                <div className="divide-y divide-slate-100">
                    {/* Channel */}
                    <div className="flex items-center gap-3 px-5 py-4">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-slate-400">Event / สาขา</p>
                            <p className="text-sm text-slate-700 font-medium">{request.channel.name}</p>
                            <p className="text-xs text-slate-400">{request.channel.location}</p>
                        </div>
                    </div>

                    {/* Request Type */}
                    <div className="flex items-center gap-3 px-5 py-4">
                        <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-slate-400">ประเภท</p>
                            <p className="text-sm text-slate-700">{request.requestType === 'TOPUP' ? 'เบิกเพิ่ม (Top-Up)' : 'เบิกครั้งแรก (Initial)'}</p>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-3 px-5 py-4">
                        <Hash className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] text-slate-400">จำนวนที่ขอ</p>
                            {isEditing ? (
                                <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min="1"
                                />
                            ) : (
                                <p className="text-sm text-slate-700 font-bold">{request.requestedTotalQuantity.toLocaleString()} ชิ้น</p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="flex items-start gap-3 px-5 py-4">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[11px] text-slate-400">หมายเหตุ</p>
                            {isEditing ? (
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="ระบุหมายเหตุ..."
                                    rows={3}
                                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                                />
                            ) : (
                                <p className="text-sm text-slate-700">{request.notes || <span className="text-slate-400">ไม่มี</span>}</p>
                            )}
                        </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-3 px-5 py-4">
                        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-slate-400">วันที่ขอ</p>
                            <p className="text-sm text-slate-700">
                                {format(new Date(request.createdAt), "d MMM yyyy HH:mm น.", { locale: th })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setQty(String(request.requestedTotalQuantity));
                                setNotes(request.notes || "");
                                setError(null);
                            }}
                            className="flex-1 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {isPending ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                )}
            </div>

            {/* Allocations */}
            {request.allocations.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-700">รายการจัดสรร ({request.allocations.length} รายการ)</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {request.allocations.map((alloc) => (
                            <div key={alloc.id} className="flex items-center justify-between px-5 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">
                                        {alloc.product?.name || alloc.barcode}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {alloc.product?.code} {alloc.product?.color && `· ${alloc.product.color}`} {alloc.size && `· ${alloc.size}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-700">{alloc.packedQuantity} ชิ้น</p>
                                    {alloc.price > 0 && <p className="text-xs text-slate-400">฿{alloc.price.toLocaleString()}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            {/* Action buttons for pending/submitted requests */}
            {['submitted', 'pending', 'draft'].includes(request.status) && !isEditing && (
                <div className="flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={isPending}
                        className="flex-1 py-3 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                        ปฏิเสธ
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isPending}
                        className="flex-1 py-3 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {isPending ? "กำลังดำเนินการ..." : "อนุมัติ"}
                    </button>
                </div>
            )}
        </div>
    );
}
