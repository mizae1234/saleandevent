"use client";

import { useState, useRef } from "react";
import { Download, Upload, X, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

interface ParsedRow {
    barcode: string;
    code: string;
    name: string;
    size: string;
    color: string;
    category: string;
    producttype: string;
    price: number | string;
}

export function ImportProductsButton() {
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<ParsedRow[] | null>(null);
    const [importResult, setImportResult] = useState<{
        created: number;
        skipped: string[];
        errors: string[];
    } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { toastError, toastSuccess } = useToast();

    // Download template with sample data (1 per product type)
    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch("/api/products/export?sample=true");
            if (!res.ok) throw new Error("Failed to fetch sample data");
            const samples = await res.json();

            const XLSX = await import("xlsx");

            const rows = samples.length > 0
                ? samples.map((p: Record<string, unknown>) => ({
                    "บาร์โค้ด": p.barcode,
                    "รหัสสินค้า": p.code || "",
                    "ชื่อสินค้า": p.name,
                    "ไซส์": p.size || "",
                    "สี": p.color || "",
                    "หมวดหมู่": p.category || "",
                    "ประเภท": p.producttype || "",
                    "ราคาขาย": p.price || 0,
                }))
                : [{ "บาร์โค้ด": "", "รหัสสินค้า": "", "ชื่อสินค้า": "", "ไซส์": "", "สี": "", "หมวดหมู่": "", "ประเภท": "", "ราคาขาย": "" }];

            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [
                { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 8 },
                { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สินค้า");
            XLSX.writeFile(wb, "product_import_template.xlsx");
        } catch {
            toastError("ไม่สามารถดาวน์โหลด Template ได้");
        }
    };

    // Parse file and show preview
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportResult(null);

        try {
            const XLSX = await import("xlsx");
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (jsonData.length === 0) {
                toastError("ไฟล์ไม่มีข้อมูล");
                return;
            }

            const headerMap: Record<string, string> = {
                "บาร์โค้ด": "barcode",
                "รหัสสินค้า": "code",
                "ชื่อสินค้า": "name",
                "ไซส์": "size",
                "สี": "color",
                "หมวดหมู่": "category",
                "ประเภท": "producttype",
                "ราคาขาย": "price",
            };

            const rows: ParsedRow[] = jsonData.map((row: any) => {
                const mapped: any = {};
                for (const [thKey, enKey] of Object.entries(headerMap)) {
                    mapped[enKey] = row[thKey] !== undefined ? row[thKey] : "";
                }
                return mapped as ParsedRow;
            });

            setPreviewData(rows);
        } catch {
            toastError("ไม่สามารถอ่านไฟล์ได้");
        }

        // Reset file input
        e.target.value = "";
    };

    // Confirm import
    const handleConfirmImport = async () => {
        if (!previewData) return;
        setLoading(true);

        try {
            const res = await fetch("/api/products/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(previewData),
            });

            const result = await res.json();
            if (!res.ok) {
                toastError(result.error || "Import ล้มเหลว");
                return;
            }

            setImportResult(result);

            if (result.created > 0) {
                toastSuccess(`Import สำเร็จ: สร้างใหม่ ${result.created} รายการ`);
            }
        } catch {
            toastError("เกิดข้อผิดพลาดในการ Import");
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setPreviewData(null);
        setImportResult(null);
        if (importResult && importResult.created > 0) {
            window.location.reload();
        }
    };

    return (
        <>
            <div className="inline-flex items-center gap-2">
                <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-200/50 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Template
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-amber-200/50 transition-colors cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Import Excel
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </label>
            </div>

            {/* Preview Modal */}
            {previewData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">ตรวจสอบข้อมูลก่อน Import</h3>
                                    <p className="text-xs text-slate-500">ทั้งหมด {previewData.length} รายการ • บาร์โค้ดที่มีอยู่แล้วจะถูกข้าม</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto px-6 py-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">#</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">บาร์โค้ด</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">รหัส</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">ชื่อสินค้า</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">ไซส์</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">สี</th>
                                        <th className="text-left font-semibold text-slate-600 px-3 py-2">หมวดหมู่</th>
                                        <th className="text-right font-semibold text-slate-600 px-3 py-2">ราคา</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                            <td className="px-3 py-2">
                                                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.barcode || <span className="text-red-500">ว่าง</span>}</span>
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{row.code || "-"}</td>
                                            <td className="px-3 py-2 font-medium text-slate-800">{row.name || <span className="text-red-500">ไม่มีชื่อ</span>}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.size || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.color || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.category || "-"}</td>
                                            <td className="px-3 py-2 text-right text-slate-600">{row.price || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Import Result */}
                        {importResult && (
                            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 space-y-2 max-h-40 overflow-auto">
                                {importResult.created > 0 && (
                                    <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                                        <Check className="h-4 w-4" /> สร้างใหม่ {importResult.created} รายการ
                                    </p>
                                )}
                                {importResult.skipped.length > 0 && (
                                    <div className="text-sm text-amber-700">
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <AlertTriangle className="h-4 w-4" /> ข้ามบาร์โค้ดซ้ำ {importResult.skipped.length} รายการ:
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1 pl-5">
                                            {importResult.skipped.join(", ")}
                                        </p>
                                    </div>
                                )}
                                {importResult.errors.length > 0 && (
                                    <div className="text-sm text-red-700">
                                        <p className="font-medium">ข้อผิดพลาด {importResult.errors.length} รายการ:</p>
                                        {importResult.errors.map((e, i) => (
                                            <p key={i} className="text-xs text-red-600 pl-5">{e}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {importResult ? "ปิด" : "ยกเลิก"}
                            </button>
                            {!importResult && (
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {loading ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
                                    {loading ? "กำลัง Import..." : `ยืนยัน Import ${previewData.length} รายการ`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
