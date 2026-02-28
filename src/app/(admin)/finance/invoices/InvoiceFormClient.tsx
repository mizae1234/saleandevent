"use client";

import { useState, useTransition } from "react";
import { createInvoice, updateInvoice, submitInvoice } from "@/actions/invoice-actions";
import { useRouter } from "next/navigation";
import { Save, Send, RotateCcw, Percent, Loader2 } from "lucide-react";
import { numberToThaiText } from "@/lib/thai-baht-text";

interface ShippedItem {
    barcode: string;
    code: string | null;
    name: string;
    color: string | null;
    size: string | null;
    totalShipped: number;
    unitPrice: number;
}

interface InvoiceItemState {
    barcode: string;
    code: string | null;
    name: string;
    color: string | null;
    size: string | null;
    originalQty: number;
    invoiceQty: number;
    unitPrice: number;
}

interface ExistingInvoice {
    id: string;
    invoicePercent: number;
    discountPercent: number;
    notes: string | null;
    invoiceDate: string | null;
    status: string;
    items: {
        barcode: string;
        originalQty: number;
        invoiceQty: number;
        unitPrice: number;
        product: {
            barcode: string;
            code: string | null;
            name: string;
            color: string | null;
            size: string | null;
        };
    }[];
}

export function InvoiceFormClient({
    channelId,
    shippedItems,
    existingInvoice,
    channelName,
    customerName,
    defaultDiscountPercent,
}: {
    channelId: string;
    shippedItems: ShippedItem[];
    existingInvoice?: ExistingInvoice;
    channelName: string;
    customerName?: string;
    defaultDiscountPercent?: number;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const isEditing = !!existingInvoice;
    const isReadonly = existingInvoice?.status === "submitted";

    // Initialize items from existing invoice or shipped items
    const [items, setItems] = useState<InvoiceItemState[]>(() => {
        if (existingInvoice) {
            return existingInvoice.items.map((i) => ({
                barcode: i.barcode,
                code: i.product.code,
                name: i.product.name,
                color: i.product.color,
                size: i.product.size,
                originalQty: i.originalQty,
                invoiceQty: i.invoiceQty,
                unitPrice: Number(i.unitPrice),
            }));
        }
        return shippedItems.map((s) => ({
            barcode: s.barcode,
            code: s.code,
            name: s.name,
            color: s.color,
            size: s.size,
            originalQty: s.totalShipped,
            invoiceQty: s.totalShipped,
            unitPrice: s.unitPrice,
        }));
    });

    const [percent, setPercent] = useState(
        existingInvoice ? Number(existingInvoice.invoicePercent) : 100
    );
    const [discountPct, setDiscountPct] = useState(
        existingInvoice ? Number(existingInvoice.discountPercent) : (defaultDiscountPercent ?? 0)
    );
    const [notes, setNotes] = useState(existingInvoice?.notes || "");
    const [invoiceDate, setInvoiceDate] = useState(
        existingInvoice?.invoiceDate
            ? new Date(existingInvoice.invoiceDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
    );

    // Apply percentage to all items
    const applyPercent = () => {
        const pct = percent / 100;
        setItems((prev) =>
            prev.map((item) => ({
                ...item,
                invoiceQty: Math.floor(item.originalQty * pct),
            }))
        );
    };

    // Update individual item quantity
    const updateItemQty = (barcode: string, qty: number) => {
        setItems((prev) =>
            prev.map((item) =>
                item.barcode === barcode
                    ? { ...item, invoiceQty: Math.max(0, qty) }
                    : item
            )
        );
    };

    // Calculate totals
    const totalQty = items.reduce((sum, i) => sum + i.invoiceQty, 0);
    const subtotal = items.reduce(
        (sum, i) => sum + i.invoiceQty * i.unitPrice,
        0
    );
    const discountAmount = subtotal * (discountPct / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * 0.07;
    const grandTotal = afterDiscount + vatAmount;

    const fmt = (n: number) =>
        n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Save action
    const handleSave = (submitAfter: boolean) => {
        startTransition(async () => {
            try {
                const payload = {
                    invoicePercent: percent,
                    discountPercent: discountPct,
                    notes,
                    invoiceDate,
                    items: items.map((i) => ({
                        barcode: i.barcode,
                        originalQty: i.originalQty,
                        invoiceQty: i.invoiceQty,
                        unitPrice: i.unitPrice,
                    })),
                };

                if (isEditing && existingInvoice) {
                    await updateInvoice(existingInvoice.id, payload);
                    if (submitAfter) {
                        await submitInvoice(existingInvoice.id);
                    }
                } else {
                    const inv = await createInvoice({
                        channelId,
                        invoicePercent: percent,
                        discountPercent: discountPct,
                        notes,
                        invoiceDate,
                        items: payload.items,
                    });
                    if (submitAfter) {
                        await submitInvoice(inv.id);
                    }
                }

                router.push(`/finance/invoices/${channelId}`);
                router.refresh();
            } catch (e: any) {
                alert(e.message || "เกิดข้อผิดพลาด");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Saving Overlay */}
            {isPending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 space-y-4">
                        <div className="flex items-center justify-center">
                            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                        </div>
                        <p className="text-center text-sm font-medium text-slate-700">
                            กำลังบันทึก Invoice...
                        </p>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                                style={{
                                    animation: 'shimmer 1.5s ease-in-out infinite',
                                }}
                            />
                            <style>{`
                                @keyframes shimmer {
                                    0% { transform: translateX(-100%); }
                                    100% { transform: translateX(300%); }
                                }
                            `}</style>
                        </div>
                        <p className="text-center text-[11px] text-slate-400">
                            กรุณารอสักครู่...
                        </p>
                    </div>
                </div>
            )}
            {/* Info Bar */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Event
                        </label>
                        <p className="text-sm font-medium text-slate-900 mt-1">
                            {channelName}
                        </p>
                    </div>
                    {customerName && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                ลูกค้า
                            </label>
                            <p className="text-sm font-medium text-slate-900 mt-1">
                                {customerName}
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            วันที่ Invoice
                        </label>
                        <input
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            disabled={isReadonly}
                            className="mt-1 w-full border-0 border-b border-slate-300 bg-transparent text-sm py-1 focus:outline-none focus:border-teal-500 disabled:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            {/* Invoice Percentage Control */}
            {!isReadonly && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                    <div className="flex items-end gap-4">
                        <div className="flex-1 max-w-xs">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                                เปอร์เซ็นต์ Invoice (จำนวนสินค้า)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    onFocus={(e) => e.target.select()}
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={percent}
                                    onChange={(e) =>
                                        setPercent(Number(e.target.value))
                                    }
                                    className="w-full border-0 border-b-2 border-slate-300 bg-transparent text-2xl font-bold py-1 pr-8 focus:outline-none focus:border-teal-500 text-center"
                                />
                                <Percent className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            </div>
                        </div>
                        <button
                            onClick={applyPercent}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Apply ทุก Item
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        กด Apply เพื่อคำนวณจำนวนทุก Item ตามเปอร์เซ็นต์ที่กำหนด
                        (ปัดลง) หรือแก้ไขแต่ละ Item ด้านล่างเองก็ได้
                    </p>
                </div>
            )}

            {/* Items Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                    #
                                </th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                    Barcode
                                </th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">
                                    สินค้า
                                </th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">
                                    สี
                                </th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">
                                    ไซส์
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                    จำนวนส่ง
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                    จำนวน Invoice
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                    ราคา/ตัว
                                </th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">
                                    รวม (฿)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr
                                    key={item.barcode}
                                    className="hover:bg-slate-50 transition-colors"
                                >
                                    <td className="p-3 text-slate-400 text-xs">
                                        {idx + 1}
                                    </td>
                                    <td className="p-3 font-mono text-xs text-slate-600">
                                        {item.barcode}
                                    </td>
                                    <td className="p-3 text-slate-900 font-medium">
                                        {item.name}
                                    </td>
                                    <td className="p-3 text-center text-slate-600">
                                        {item.color || "-"}
                                    </td>
                                    <td className="p-3 text-center text-slate-600">
                                        {item.size || "-"}
                                    </td>
                                    <td className="p-3 text-right text-slate-500">
                                        {item.originalQty.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right">
                                        {isReadonly ? (
                                            <span className="font-semibold text-slate-900">
                                                {item.invoiceQty.toLocaleString()}
                                            </span>
                                        ) : (
                                            <input
                                                type="number"
                                                onFocus={(e) => e.target.select()}
                                                min={0}
                                                max={item.originalQty}
                                                value={item.invoiceQty}
                                                onChange={(e) =>
                                                    updateItemQty(
                                                        item.barcode,
                                                        parseInt(
                                                            e.target.value
                                                        ) || 0
                                                    )
                                                }
                                                className="w-20 text-right border-0 border-b-2 border-slate-300 bg-transparent py-0.5 text-sm font-semibold focus:outline-none focus:border-teal-500"
                                            />
                                        )}
                                    </td>
                                    <td className="p-3 text-right text-slate-600">
                                        {item.unitPrice.toLocaleString("th-TH", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="p-3 text-right font-medium text-slate-900">
                                        {(
                                            item.invoiceQty * item.unitPrice
                                        ).toLocaleString("th-TH", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        {/* ===== FOOTER: Financial Summary ===== */}
                        <tfoot>
                            {/* Subtotal */}
                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                <td colSpan={6} className="p-3 text-right text-sm font-semibold text-slate-700">
                                    จำนวนรวม
                                </td>
                                <td className="p-3 text-right text-sm font-bold text-slate-700">
                                    {totalQty.toLocaleString()}
                                </td>
                                <td className="p-3 text-right text-sm text-slate-500">
                                    รวมเป็นเงิน
                                </td>
                                <td className="p-3 text-right text-sm font-bold text-slate-900">
                                    {fmt(subtotal)}
                                </td>
                            </tr>

                            {/* Discount */}
                            <tr className="bg-slate-50">
                                <td colSpan={7} className="p-3"></td>
                                <td className="p-3 text-right text-sm text-slate-500">
                                    <span className="flex items-center justify-end gap-1">
                                        ส่วนลด
                                        {isReadonly ? (
                                            <span className="font-medium text-slate-700">{discountPct}%</span>
                                        ) : (
                                            <input
                                                type="number"
                                                onFocus={(e) => e.target.select()}
                                                min={0}
                                                max={100}
                                                step={0.01}
                                                value={discountPct}
                                                onChange={(e) => setDiscountPct(Number(e.target.value))}
                                                className="w-16 text-right border-0 border-b-2 border-slate-300 bg-transparent py-0 text-sm font-semibold focus:outline-none focus:border-teal-500"
                                            />
                                        )}
                                        %
                                    </span>
                                </td>
                                <td className="p-3 text-right text-sm font-medium text-red-600">
                                    -{fmt(discountAmount)}
                                </td>
                            </tr>

                            {/* After Discount */}
                            <tr className="bg-slate-50">
                                <td colSpan={7} className="p-3"></td>
                                <td className="p-3 text-right text-sm text-slate-500">
                                    ยอดหลังหักส่วนลด
                                </td>
                                <td className="p-3 text-right text-sm font-bold text-slate-900">
                                    {fmt(afterDiscount)}
                                </td>
                            </tr>

                            {/* VAT */}
                            <tr className="bg-slate-50">
                                <td colSpan={7} className="p-3"></td>
                                <td className="p-3 text-right text-sm text-slate-500">
                                    ภาษีมูลค่าเพิ่ม 7%
                                </td>
                                <td className="p-3 text-right text-sm font-medium text-slate-700">
                                    {fmt(vatAmount)}
                                </td>
                            </tr>

                            {/* Grand Total */}
                            <tr className="bg-teal-50 border-t-2 border-teal-200">
                                <td colSpan={7} className="p-3"></td>
                                <td className="p-3 text-right text-sm font-bold text-teal-800">
                                    จำนวนรวมทั้งสิ้น
                                </td>
                                <td className="p-3 text-right text-lg font-bold text-teal-800">
                                    {fmt(grandTotal)}
                                </td>
                            </tr>

                            {/* Thai Baht Text */}
                            <tr className="bg-teal-50">
                                <td colSpan={9} className="px-3 pb-3 pt-0">
                                    <p className="text-sm text-teal-700 font-medium">
                                        ({numberToThaiText(grandTotal)})
                                    </p>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                    หมายเหตุ
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isReadonly}
                    rows={2}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    className="w-full border-0 border-b border-slate-300 bg-transparent text-sm py-1 focus:outline-none focus:border-teal-500 resize-none disabled:text-slate-500"
                />
            </div>

            {/* Action Buttons */}
            {!isReadonly && (
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={isPending || items.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {isPending ? "กำลังบันทึก..." : "บันทึกฉบับร่าง"}
                    </button>
                    <button
                        onClick={() => {
                            if (
                                confirm(
                                    "ต้องการ Submit Invoice นี้หรือไม่? เมื่อ Submit แล้วจะไม่สามารถแก้ไขได้"
                                )
                            ) {
                                handleSave(true);
                            }
                        }}
                        disabled={isPending || items.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        {isPending
                            ? "กำลังดำเนินการ..."
                            : "Submit & ออกเลข Invoice"}
                    </button>
                </div>
            )}
        </div>
    );
}
