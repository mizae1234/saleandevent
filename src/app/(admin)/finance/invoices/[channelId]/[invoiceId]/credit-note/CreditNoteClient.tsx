'use client';

import { useState, useTransition } from "react";
import { AlertCircle, Calculator, CheckCircle2, FileText, Save, RefreshCw } from "lucide-react";
import { Spinner, FormInput, FormTextarea } from "@/components/shared";
import { createCreditNote, updateCreditNote } from "@/actions/credit-note-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface InvoiceItemNode {
    id: string;
    barcode: string;
    unitPrice: number;
    invoiceQty: number;
    availableQty: number;
    productName: string;
    color: string;
    size: string;
}

interface Props {
    invoiceId: string;
    initialCnNumber: string;
    invoiceItems: InvoiceItemNode[];
    grandTotal: number;
    netTotal: number;
    isEdit?: boolean;
    existingCnId?: string;
    existingAllocations?: Record<string, number>;
    existingReason?: string;
    existingTargetAmount?: number;
}

export function CreditNoteClient({ 
    invoiceId, 
    initialCnNumber, 
    invoiceItems, 
    grandTotal, 
    netTotal,
    isEdit = false, 
    existingCnId, 
    existingAllocations = {}, 
    existingReason = '', 
    existingTargetAmount = 0 
}: Props) {
    const router = useRouter();
    const { toastSuccess, toastError } = useToast();
    const [isPending, startTransition] = useTransition();

    const [cnNumber, setCnNumber] = useState<string>(initialCnNumber);
    const [targetAmount, setTargetAmount] = useState<number>(existingTargetAmount);
    const [reason, setReason] = useState<string>(existingReason);
    const [allocations, setAllocations] = useState<Record<string, number>>(existingAllocations);

    // Calculate total allocated
    const calculatedTotal = invoiceItems.reduce((sum, item) => {
        const qty = allocations[item.id] || 0;
        return sum + (qty * item.unitPrice);
    }, 0);

    const difference = targetAmount - calculatedTotal;

    const handleAutoAllocate = () => {
        if (targetAmount <= 0) {
            toastError('กรุณากรอกยอดเงินเป้าหมายที่ต้องการสมมติ');
            return;
        }

        let remaining = targetAmount;
        const newAllocations: Record<string, number> = {};

        const sortedItems = [...invoiceItems].sort((a, b) => b.unitPrice - a.unitPrice);

        let allocatedAny = true;
        while (remaining > 0 && allocatedAny) {
            allocatedAny = false;
            for (const item of sortedItems) {
                const currentAlloc = newAllocations[item.id] || 0;
                if (remaining >= item.unitPrice && currentAlloc < item.availableQty) {
                    newAllocations[item.id] = currentAlloc + 1;
                    remaining -= item.unitPrice;
                    allocatedAny = true;
                }
            }
        }

        setAllocations(newAllocations);
    };

    const handleAllocationChange = (id: string, value: string, maxQty: number) => {
        let parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 0) parsed = 0;
        // Allows exceeding original qty if they REALLY want? Usually no.
        if (parsed > maxQty) parsed = maxQty;

        setAllocations(prev => ({
            ...prev,
            [id]: parsed
        }));
    };

    const handleSubmit = () => {
        if (targetAmount <= 0) {
            toastError("กรุณากรอกยอดเป้าหมายลดหนี้");
            return;
        }

        startTransition(async () => {
            const items = invoiceItems.map(item => {
                const qty = allocations[item.id] || 0;
                return {
                    invoiceItemId: item.id,
                    barcode: item.barcode,
                    quantity: qty,
                    unitPrice: item.unitPrice,
                    totalAmount: qty * item.unitPrice
                };
            }).filter(i => i.quantity > 0);

            if (isEdit && existingCnId) {
                const res = await updateCreditNote(existingCnId, {
                    invoiceId,
                    cnNumber,
                    totalAmount: targetAmount,
                    reason,
                    items
                });

                if (res.success) {
                    toastSuccess("อัปเดตใบลดหนี้สำเร็จ");
                    router.push(`/finance/invoices/${invoiceId.split('-')[0]}/${invoiceId}`); // Hacky way for back, better just push /finance/invoices
                    router.push(`/finance/invoices`);
                } else {
                    toastError(res.error || "เกิดข้อผิดพลาดในการอัปเดต");
                }
            } else {
                const res = await createCreditNote({
                    invoiceId,
                    cnNumber,
                    totalAmount: targetAmount,
                    reason,
                    items
                });

                if (res.success) {
                    toastSuccess("ออกใบลดหนี้สำเร็จ");
                    router.push(`/finance/invoices`);
                } else {
                    toastError(res.error || "ออกใบลดหนี้ไม่สำเร็จ");
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Setup Target */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <FormInput
                                label="เลขที่ใบลดหนี้ (CN Number)"
                                type="text"
                                required
                                value={cnNumber}
                                onChange={(e) => setCnNumber(e.target.value)}
                                placeholder="CN-00000X"
                            />
                        </div>
                        <div>
                            <FormInput
                                label="ยอดเป้าหมายลดหนี้"
                                type="number"
                                required
                                value={targetAmount || ''}
                                onChange={(e) => setTargetAmount(Number(e.target.value))}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                มูลค่าบิลคงเหลือ: ฿{netTotal.toLocaleString()} (จากเดิม ฿{grandTotal.toLocaleString()})
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                ตัวช่วยจัดสรรรายการ
                            </label>
                            <button
                                type="button"
                                onClick={handleAutoAllocate}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                            >
                                <Calculator className="h-4 w-4" />
                                คำนวณจัดสรรอัตโนมัติจากยอดเป้าหมาย
                            </button>
                            <p className="text-xs text-slate-500 mt-2">
                                * ระบบจะเลือกจำนวนสินค้าในบิลมารับยอดให้ใกล้เคียงที่สุด
                            </p>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Warning Box */}
                    {targetAmount > 0 && Math.abs(difference) > 0.01 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">ยอดจัดสรรไม่ลงตัว (Warning)</p>
                                <p className="text-sm mt-1">
                                    ยอดรวมจากรายการที่เลือก (฿{calculatedTotal.toLocaleString()}) ไม่เท่ากับยอดเป้าหมาย (฿{targetAmount.toLocaleString()}).
                                    ยังขาด/เกินอยู่ <strong className="font-bold">฿{difference.toLocaleString()}</strong>
                                </p>
                                <p className="text-sm mt-1 text-amber-700">
                                    กรุณาปรับปรุงจำนวนชิ้นเพิ่มเติมด้านล่าง หากคุณต้องการให้ยอดตรงกัน หรือคุณสามารถบันทึกทั้งแบบนี้ได้เลย (ถือว่าส่วนต่างเป็นการปรับลดเพิ่มเติม/ปรับเศษ)
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {targetAmount > 0 && Math.abs(difference) <= 0.01 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 text-green-800">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                            <div>
                                <p className="font-semibold text-sm">ยอดจัดสรรลงตัวพอดี</p>
                                <p className="text-sm mt-1">
                                    ยอดรวมจากรายการที่เลือกตรงกับยอดเป้าหมายที่ต้องการลดแล้ว (฿{calculatedTotal.toLocaleString()})
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    <div className="relative">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                    <th className="pb-3 px-4 font-medium w-12">ลำดับ</th>
                                    <th className="pb-3 px-4 font-medium">รายการสินค้าในบิล</th>
                                    <th className="pb-3 px-4 font-medium text-right w-32">ราคา/ชิ้น</th>
                                    <th className="pb-3 px-4 font-medium text-right w-32">ลดเพิ่มได้อีก</th>
                                    <th className="pb-3 px-4 font-medium text-right w-40">จำนวนอ้างอิงลดหนี้</th>
                                    <th className="pb-3 px-4 font-medium text-right w-40">รวม (฿)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                {invoiceItems.map((item, idx) => {
                                    const allocQty = allocations[item.id] || 0;
                                    const totalRow = allocQty * item.unitPrice;
                                    const isAllocated = allocQty > 0;

                                    return (
                                        <tr key={item.id} className={`transition-colors hover:bg-slate-50 ${isAllocated ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">{item.productName}</div>
                                                <div className="text-slate-500 text-xs mt-0.5 whitespace-nowrap">
                                                    {item.barcode} | สี: {item.color} | ไซส์: {item.size}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                                                {item.unitPrice.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right tabular-nums font-medium text-amber-600">
                                                {item.availableQty} / {item.invoiceQty}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.availableQty}
                                                    value={allocQty || ''}
                                                    onChange={(e) => handleAllocationChange(item.id, e.target.value, item.availableQty)}
                                                    className="w-24 text-right border border-slate-300 rounded-md shadow-sm p-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className={`py-3 px-4 text-right tabular-nums font-medium ${isAllocated ? 'text-indigo-700' : 'text-slate-400'}`}>
                                                {totalRow > 0 ? totalRow.toLocaleString() : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="border-t-2 border-slate-200">
                                <tr className="bg-slate-50">
                                    <td colSpan={5} className="py-4 px-4 text-right font-medium text-slate-700">
                                        รวมประเมินจากรายการที่เลือก:
                                    </td>
                                    <td className="py-4 px-4 text-right font-bold text-slate-900 text-lg tabular-nums">
                                        ฿{calculatedTotal.toLocaleString()}
                                    </td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td colSpan={5} className="py-2 px-4 text-right font-medium text-slate-700">
                                        ยอดเป้าหมายลดหนี้ (Target Amount):
                                    </td>
                                    <td className="py-2 px-4 text-right font-bold text-rose-600 text-lg tabular-nums">
                                        ฿{targetAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Reason */}
                    <div>
                        <FormTextarea
                            label="หมายเหตุ / เหตุผลการออกใบลดหนี้"
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="ระบุเหตุผลเพื่อใช้อ้างอิง..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {isPending ? <Spinner size="sm" /> : (isEdit ? <RefreshCw className="h-5 w-5" /> : <Save className="h-5 w-5" />)}
                            {isEdit ? "อัปเดตใบลดหนี้" : "บันทึกใบลดหนี้"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
