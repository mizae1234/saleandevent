"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, RefreshCw, ArrowLeft, CheckCircle, Loader2, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    approvedAt: Date | null;
    event: Event;
    items: RequestItem[];
}

interface Props {
    request: StockRequest;
}

export function RefillPackingClient({ request }: Props) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");

    // State to track packed quantities - default 0
    const [packedItems, setPackedItems] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        request.items.forEach(item => {
            initial[item.id] = 0;
        });
        return initial;
    });

    // State to track if an item is "checked" (active for packing)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        request.items.forEach(item => {
            initial[item.id] = false;
        });
        return initial;
    });

    const handleCheck = (itemId: string, requestedQty: number) => {
        const isCurrentlyChecked = checkedItems[itemId];
        const newCheckedState = !isCurrentlyChecked;

        setCheckedItems(prev => ({ ...prev, [itemId]: newCheckedState }));

        // If checking -> default quantity to requested amount
        // If unchecking -> set quantity to 0
        if (newCheckedState) {
            setPackedItems(prev => ({ ...prev, [itemId]: requestedQty }));
        } else {
            setPackedItems(prev => ({ ...prev, [itemId]: 0 }));
        }
    };

    const handleQuantityChange = (itemId: string, val: string) => {
        const num = parseInt(val) || 0;
        setPackedItems(prev => ({ ...prev, [itemId]: num }));

        // If user manually types a number > 0, auto-check
        if (num > 0 && !checkedItems[itemId]) {
            setCheckedItems(prev => ({ ...prev, [itemId]: true }));
        }
    };

    const handleConfirmPacking = async () => {
        setError("");
        setIsProcessing(true);
        try {
            // Convert state to array for API
            const packingData = Object.entries(packedItems).map(([id, qty]) => ({
                itemId: id,
                packedQuantity: qty
            }));

            const res = await fetch(`/api/stock-requests/${request.id}/pack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packingData })
            });

            if (res.ok) {
                router.push('/warehouse/packing');
                router.refresh();
            } else {
                throw new Error("Failed to save");
            }
        } catch (err) {
            console.error("Error:", err);
            setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsProcessing(false);
        }
    };

    const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/warehouse/packing"
                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับหน้างานรอแพ็ค
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-blue-500" />
                        แพคของ - คำขอเบิกเพิ่ม
                    </h1>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Package className="h-4 w-4" />
                    {request.status === 'approved' ? 'รอแพค' : request.status}
                </span>
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 text-white rounded-lg">
                        <RefreshCw className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg text-slate-900">{request.event.name}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <span className="font-mono">{request.event.code}</span>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            {request.event.location}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
                        <p className="text-xs text-slate-500">ชิ้นที่ขอ</p>
                    </div>
                </div>
                {request.approvedAt && (
                    <p className="text-xs text-slate-400 mt-3">
                        อนุมัติเมื่อ: {format(new Date(request.approvedAt), 'd MMMM yyyy, HH:mm', { locale: th })}
                    </p>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Items to Pack */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                    <Package className="h-5 w-5 text-blue-500" />
                    รายการสินค้า ({request.items.length})
                </h3>

                <div className="space-y-2">
                    {request.items.map((item) => {
                        const isChecked = checkedItems[item.id];
                        const packedQty = packedItems[item.id] || 0;

                        return (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isChecked
                                        ? "bg-blue-50 border-blue-200"
                                        : "bg-white border-slate-100 hover:border-slate-200"
                                    }`}
                            >
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => handleCheck(item.id, item.quantity)}
                                >
                                    <div className={`transition-colors ${isChecked ? "text-blue-600" : "text-slate-300"}`}>
                                        {isChecked ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                                    </div>

                                    <div>
                                        <p className={`font-medium transition-colors ${isChecked ? "text-slate-900" : "text-slate-500"}`}>
                                            {item.product.name}
                                        </p>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {item.product.code || item.barcode} {item.product.size ? `• ${item.product.size}` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* ขอมา (Requested) */}
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400 block">ขอมา</span>
                                        <span className="text-sm font-medium text-slate-600">{item.quantity}</span>
                                    </div>

                                    {/* แพคจริง (Actual Packed) */}
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-slate-400 block mb-1">แพคจริง</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={packedQty.toString()}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            className={`w-20 text-right h-9 font-bold rounded-md border px-2 ${isChecked
                                                    ? "border-blue-300 text-blue-700 bg-white"
                                                    : "bg-slate-50 text-slate-400 border-slate-200"
                                                }`}
                                            disabled={!isChecked}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Bar */}
            <div className="sticky bottom-4 rounded-xl bg-white border border-slate-200 p-4 shadow-lg flex items-center justify-between z-10">
                <div>
                    <p className="text-sm font-medium text-slate-700">
                        รายการที่แพค: {checkedCount} / {request.items.length}
                    </p>
                    <p className="text-xs text-slate-500">
                        ตรวจสอบความถูกต้องก่อนบันทึก
                    </p>
                </div>

                <button
                    onClick={handleConfirmPacking}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                >
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                    บันทึกและยืนยันการแพค
                </button>
            </div>
        </div>
    );
}
