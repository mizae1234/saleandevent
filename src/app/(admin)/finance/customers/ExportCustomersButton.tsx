"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useToast } from "@/components/ui/toast";

export function ExportCustomersButton() {
    const [loading, setLoading] = useState(false);
    const { toastError, toastSuccess } = useToast();

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/customers/export");
            if (!res.ok) throw new Error("Failed to fetch");
            const customers = await res.json();

            if (customers.length === 0) {
                toastError("ไม่พบข้อมูลลูกค้า");
                return;
            }

            const XLSX = await import("xlsx");

            const rows = customers.map((c: any, i: number) => ({
                "ลำดับ": i + 1,
                "รหัส": c.code || "",
                "ชื่อลูกค้า": c.name,
                "เลขผู้เสียภาษี": c.taxId || "",
                "ที่อยู่": c.address || "",
                "เบอร์โทร": c.phone || "",
                "เครดิต (วัน)": c.creditTerm || 0,
                "ส่วนลด %": Number(c.discountPercent || 0),
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [
                { wch: 6 },   // ลำดับ
                { wch: 10 },  // รหัส
                { wch: 40 },  // ชื่อลูกค้า
                { wch: 18 },  // เลขผู้เสียภาษี
                { wch: 50 },  // ที่อยู่
                { wch: 14 },  // เบอร์โทร
                { wch: 12 },  // เครดิต
                { wch: 10 },  // ส่วนลด
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ลูกค้า");

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `customers_${dateStr}.xlsx`);

            toastSuccess(`Export สำเร็จ ${customers.length} ราย`);
        } catch {
            toastError("เกิดข้อผิดพลาดในการ Export");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-emerald-200/50 transition-colors disabled:opacity-50"
        >
            {loading ? <Spinner size="sm" /> : <FileSpreadsheet className="h-4 w-4" />}
            {loading ? "กำลัง Export..." : "Export Excel"}
        </button>
    );
}
