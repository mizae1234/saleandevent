"use client";

import { useState, useRef } from "react";
import { Download, Upload, X, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

interface ParsedStaffRow {
    name: string;
    role: string;
    employeeType: string;
    position: string;
    dateOfBirth: string;
    phone: string;
    paymentType: string;
    dailyRate: number | string;
    commissionAmount: number | string;
    bankName: string;
    bankAccountNo: string;
    taxId: string;
    address: string;
}

export function ImportStaffButton() {
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<ParsedStaffRow[] | null>(null);
    const [importResult, setImportResult] = useState<{
        created: number;
        skipped: string[];
        errors: string[];
    } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { toastError, toastSuccess } = useToast();

    // Download template with sample data
    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import("xlsx");

            const sampleRows = [
                {
                    "ชื่อ-สกุล": "สมชาย ดีงาม",
                    "บทบาท": "STAFF",
                    "ประเภทพนักงาน": "ประจำ",
                    "ตำแหน่ง": "พนักงานทั่วไป",
                    "วันเกิด (วัน/เดือน/ปี ค.ศ.)": "15/08/1990",
                    "เบอร์โทร": "0812345678",
                    "ประเภทการจ่าย": "รายวัน",
                    "ค่าแรง (บาท)": 400,
                    "คอมมิชชั่น (บาท)": 0,
                    "ธนาคาร": "กสิกรไทย",
                    "เลขบัญชี": "123-4-56789-0",
                    "เลขผู้เสียภาษี": "1234567890123",
                    "ที่อยู่": "123/45 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพฯ 10500"
                },
                {
                    "ชื่อ-สกุล": "สมศรี รักดี",
                    "บทบาท": "PC",
                    "ประเภทพนักงาน": "พาร์ทไทม์",
                    "ตำแหน่ง": "พนักงานขาย",
                    "วันเกิด (วัน/เดือน/ปี ค.ศ.)": "20/02/1998",
                    "เบอร์โทร": "0898765432",
                    "ประเภทการจ่าย": "รายวัน",
                    "ค่าแรง (บาท)": 350,
                    "คอมมิชชั่น (บาท)": 50,
                    "ธนาคาร": "ไทยพาณิชย์",
                    "เลขบัญชี": "987-6-54321-0",
                    "เลขผู้เสียภาษี": "9876543210987",
                    "ที่อยู่": "99/9 หมู่ 1 ต.บางกรวย อ.บางกรวย จ.นนทบุรี 11130"
                }
            ];

            const ws = XLSX.utils.json_to_sheet(sampleRows);
            ws["!cols"] = [
                { wch: 25 }, // ชื่อ-สกุล
                { wch: 10 }, // บทบาท
                { wch: 15 }, // ประเภทพนักงาน
                { wch: 15 }, // ตำแหน่ง
                { wch: 25 }, // วันเกิด
                { wch: 15 }, // เบอร์โทร
                { wch: 15 }, // ประเภทการจ่าย
                { wch: 12 }, // ค่าแรง
                { wch: 15 }, // คอมมิชชั่น
                { wch: 15 }, // ธนาคาร
                { wch: 16 }, // เลขบัญชี
                { wch: 18 }, // เลขผู้เสียภาษี
                { wch: 45 }, // ที่อยู่
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายชื่อพนักงาน");
            XLSX.writeFile(wb, "employee_import_template.xlsx");
            toastSuccess("ดาวน์โหลดไฟล์เทมเพลตสำเร็จ");
        } catch {
            toastError("ไม่สามารถดาวน์โหลดเทมเพลตได้");
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
                toastError("ไฟล์ไม่มีข้อมูลพนักงาน");
                return;
            }

            const headerMap: Record<string, string> = {
                "ชื่อ-สกุล": "name",
                "บทบาท": "role",
                "ประเภทพนักงาน": "employeeType",
                "ตำแหน่ง": "position",
                "วันเกิด (วัน/เดือน/ปี ค.ศ.)": "dateOfBirth",
                "เบอร์โทร": "phone",
                "ประเภทการจ่าย": "paymentType",
                "ค่าแรง (บาท)": "dailyRate",
                "คอมมิชชั่น (บาท)": "commissionAmount",
                "ธนาคาร": "bankName",
                "เลขบัญชี": "bankAccountNo",
                "เลขผู้เสียภาษี": "taxId",
                "ที่อยู่": "address",
            };

            const rows: ParsedStaffRow[] = jsonData.map((row: any) => {
                const mapped: any = {};
                for (const [thKey, enKey] of Object.entries(headerMap)) {
                    mapped[enKey] = row[thKey] !== undefined ? row[thKey] : "";
                }
                return mapped as ParsedStaffRow;
            });

            // Filter out empty rows (where name is empty)
            const filteredRows = rows.filter(r => r.name.trim() !== "");
            if (filteredRows.length === 0) {
                toastError("ไม่พบข้อมูลพนักงานที่มีชื่อในไฟล์");
                return;
            }

            setPreviewData(filteredRows);
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
            const res = await fetch("/api/staff/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(previewData),
            });

            const result = await res.json();
            if (!res.ok) {
                toastError(result.error || "นำเข้าล้มเหลว");
                return;
            }

            setImportResult(result);

            if (result.created > 0) {
                toastSuccess(`นำเข้าสำเร็จ: สร้างพนักงานใหม่ ${result.created} คน`);
            }
        } catch {
            toastError("เกิดข้อผิดพลาดในการนำเข้า");
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
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-200/50 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Template
                </button>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-amber-200/50 transition-colors cursor-pointer">
                    <Upload className="h-4 w-4" />
                    นำเข้าพนักงาน (Excel)
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
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">ตรวจสอบข้อมูลก่อนยืนยันนำเข้าพนักงาน</h3>
                                    <p className="text-xs text-slate-500">ทั้งหมด {previewData.length} รายการ • รายชื่อพนักงานที่ซ้ำในระบบจะถูกข้าม</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto px-6 py-4">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="font-semibold text-slate-600 px-3 py-2">#</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">ชื่อ-สกุล</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">บทบาท</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">ประเภท</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">ตำแหน่ง</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">วันเกิด</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">เบอร์โทร</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">การจ่ายเงิน</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2 text-right">ค่าแรง</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2 text-right">คอมมิชชั่น</th>
                                        <th className="font-semibold text-slate-600 px-3 py-2">ธนาคาร/เลขบัญชี</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                            <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.role || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.employeeType || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.position || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.dateOfBirth || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.phone || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.paymentType || "-"}</td>
                                            <td className="px-3 py-2 text-right text-slate-600 font-mono">{row.dailyRate || "-"}</td>
                                            <td className="px-3 py-2 text-right text-slate-600 font-mono">{row.commissionAmount || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.bankName ? `${row.bankName} ${row.bankAccountNo || ""}` : "-"}</td>
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
                                        <Check className="h-4 w-4" /> สร้างพนักงานใหม่สำเร็จ {importResult.created} คน
                                    </p>
                                )}
                                {importResult.skipped.length > 0 && (
                                    <div className="text-sm text-amber-700">
                                        <p className="flex items-center gap-1.5 font-medium">
                                            <AlertTriangle className="h-4 w-4" /> ข้ามรายชื่อพนักงานที่มีอยู่แล้วในระบบ {importResult.skipped.length} คน:
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1 pl-5">
                                            {importResult.skipped.join(", ")}
                                        </p>
                                    </div>
                                )}
                                {importResult.errors.length > 0 && (
                                    <div className="text-sm text-red-700">
                                        <p className="font-medium">พบข้อผิดพลาด {importResult.errors.length} รายการ:</p>
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
                                type="button"
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                {importResult ? "ปิดหน้าต่าง" : "ยกเลิก"}
                            </button>
                            {!importResult && (
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={loading}
                                    type="button"
                                    className="inline-flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {loading ? <Spinner size="sm" /> : <Upload className="h-4 w-4" />}
                                    {loading ? "กำลังบันทึก..." : `ยืนยันนำเข้าพนักงาน ${previewData.length} คน`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
