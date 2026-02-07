"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, Loader2, CheckCircle2, Minus, Plus } from "lucide-react";
import { closeEventStock } from "@/actions/event-actions";

type StockItem = {
    barcode: string;
    productName: string;
    productCode: string | null;
    size: string | null;
    price: number;
    receivedQuantity: number;
    soldQuantity: number;
    remainingQuantity: number;
};

type CloseItem = {
    barcode: string;
    damaged: number;
    missing: number;
};

type Props = {
    eventId: string;
    eventName: string;
    stockDetails: StockItem[];
};

export function CloseEventClient({ eventId, eventName, stockDetails }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [closeItems, setCloseItems] = useState<Record<string, CloseItem>>(() => {
        const initial: Record<string, CloseItem> = {};
        stockDetails.forEach(item => {
            initial[item.barcode] = { barcode: item.barcode, damaged: 0, missing: 0 };
        });
        return initial;
    });
    const router = useRouter();

    const updateItem = (barcode: string, field: 'damaged' | 'missing', value: number) => {
        const item = stockDetails.find(s => s.barcode === barcode);
        if (!item) return;

        // Ensure value doesn't exceed remaining
        const otherField = field === 'damaged' ? 'missing' : 'damaged';
        const maxValue = item.remainingQuantity - closeItems[barcode][otherField];
        const clampedValue = Math.max(0, Math.min(value, maxValue));

        setCloseItems(prev => ({
            ...prev,
            [barcode]: { ...prev[barcode], [field]: clampedValue }
        }));
    };

    const handleSubmit = () => {
        setError("");

        const items = Object.values(closeItems).map(item => ({
            barcode: item.barcode,
            damaged: item.damaged,
            missing: item.missing
        }));

        startTransition(async () => {
            try {
                await closeEventStock(eventId, items);
                router.push(`/pc/close/${eventId}/shipping`);
            } catch (e: any) {
                setError(e.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
            }
        });
    };

    // Calculate totals
    const totalDamaged = Object.values(closeItems).reduce((sum, item) => sum + item.damaged, 0);
    const totalMissing = Object.values(closeItems).reduce((sum, item) => sum + item.missing, 0);
    const totalRemaining = stockDetails.reduce((sum, s) => sum + s.remainingQuantity, 0);
    const totalReturn = totalRemaining - totalDamaged - totalMissing;

    return (
        <div className="space-y-6">
            {/* Stock Items Table */}
            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-500" />
                        รายการสินค้า
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">กรอกจำนวนสินค้าชำรุดและสูญหาย (ถ้ามี)</p>
                </div>

                {error && (
                    <div className="mx-4 mt-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-500">
                        <div className="col-span-4">สินค้า</div>
                        <div className="col-span-2 text-center">รับมา</div>
                        <div className="col-span-2 text-center">ขายแล้ว</div>
                        <div className="col-span-2 text-center">ชำรุด</div>
                        <div className="col-span-2 text-center">สูญหาย</div>
                    </div>

                    {/* Items */}
                    {stockDetails.map((item) => {
                        const closeItem = closeItems[item.barcode];
                        const returnQty = item.remainingQuantity - closeItem.damaged - closeItem.missing;

                        return (
                            <div key={item.barcode} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                {/* Product Info */}
                                <div className="col-span-4">
                                    <p className="font-medium text-slate-900">{item.productName}</p>
                                    <p className="text-xs text-slate-400">
                                        {item.productCode || item.barcode} {item.size && `• ${item.size}`}
                                    </p>
                                </div>

                                {/* Received */}
                                <div className="col-span-2 text-center">
                                    <span className="text-slate-700 font-medium">{item.receivedQuantity}</span>
                                </div>

                                {/* Sold */}
                                <div className="col-span-2 text-center">
                                    <span className="text-blue-600 font-medium">{item.soldQuantity}</span>
                                </div>

                                {/* Damaged */}
                                <div className="col-span-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => updateItem(item.barcode, 'damaged', closeItem.damaged - 1)}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                                            disabled={closeItem.damaged <= 0}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.remainingQuantity - closeItem.missing}
                                            value={closeItem.damaged}
                                            onChange={(e) => updateItem(item.barcode, 'damaged', parseInt(e.target.value) || 0)}
                                            className="w-12 text-center px-1 py-1 rounded border border-slate-200 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateItem(item.barcode, 'damaged', closeItem.damaged + 1)}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                                            disabled={closeItem.damaged >= item.remainingQuantity - closeItem.missing}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Missing */}
                                <div className="col-span-2">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => updateItem(item.barcode, 'missing', closeItem.missing - 1)}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                                            disabled={closeItem.missing <= 0}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.remainingQuantity - closeItem.damaged}
                                            value={closeItem.missing}
                                            onChange={(e) => updateItem(item.barcode, 'missing', parseInt(e.target.value) || 0)}
                                            className="w-12 text-center px-1 py-1 rounded border border-slate-200 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateItem(item.barcode, 'missing', closeItem.missing + 1)}
                                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                                            disabled={closeItem.missing >= item.remainingQuantity - closeItem.damaged}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">สรุป</h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-lg bg-slate-50 p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">คงเหลือทั้งหมด</p>
                        <p className="text-2xl font-bold text-slate-700">{totalRemaining}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4 text-center">
                        <p className="text-xs text-amber-600 mb-1">ชำรุด</p>
                        <p className="text-2xl font-bold text-amber-700">{totalDamaged}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4 text-center">
                        <p className="text-xs text-red-600 mb-1">สูญหาย</p>
                        <p className="text-2xl font-bold text-red-700">{totalMissing}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4 text-center">
                        <p className="text-xs text-emerald-600 mb-1">ส่งคืน</p>
                        <p className="text-2xl font-bold text-emerald-700">{totalReturn}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5" />
                    )}
                    ยืนยันปิดยอด
                </button>
            </div>
        </div>
    );
}
