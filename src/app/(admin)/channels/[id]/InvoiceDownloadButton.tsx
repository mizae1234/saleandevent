"use client";

import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";
import { generateInvoicePdf, type InvoicePdfData } from "@/lib/invoice-pdf";

interface Props {
    channelId: string;
    channelName: string;
}

export function InvoiceDownloadButton({ channelId, channelName }: Props) {
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState<InvoicePdfData[] | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const { toastError } = useToast();

    const fetchAndDownload = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/channels/${channelId}/invoices`);
            if (!res.ok) {
                const err = await res.json();
                toastError(err.error || "ไม่พบ Invoice ที่อนุมัติแล้ว");
                return;
            }
            const data: InvoicePdfData[] = await res.json();

            if (data.length === 1) {
                // Single invoice — download immediately
                await generateInvoicePdf(data[0]);
            } else {
                // Multiple invoices — show picker
                setInvoices(data);
                setShowPicker(true);
            }
        } catch {
            toastError("เกิดข้อผิดพลาดในการสร้าง Invoice");
        } finally {
            setLoading(false);
        }
    };

    const handlePickerDownload = async (invoice: InvoicePdfData) => {
        setLoading(true);
        try {
            await generateInvoicePdf(invoice);
        } catch {
            toastError("เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
            setShowPicker(false);
        }
    };

    const fmt = (n: number) =>
        n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="relative">
            <button
                onClick={fetchAndDownload}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
                {loading ? (
                    <Spinner size="sm" />
                ) : (
                    <FileText className="h-4 w-4" />
                )}
                {loading ? "กำลังสร้าง..." : "ดาวน์โหลด Invoice"}
            </button>

            {showPicker && invoices && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">
                            เลือก Invoice
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            มี {invoices.length} Invoice ที่อนุมัติแล้ว
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {invoices.map((inv, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePickerDownload(inv)}
                                    disabled={loading}
                                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {inv.invoiceNumber || `ฉบับร่าง #${i + 1}`}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {inv.totalQuantity} ชิ้น · ฿{fmt(inv.grandTotal)}
                                            </p>
                                        </div>
                                        <Download className="h-4 w-4 text-indigo-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowPicker(false)}
                            className="w-full mt-3 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
