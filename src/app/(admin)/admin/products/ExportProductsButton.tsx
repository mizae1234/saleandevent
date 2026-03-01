"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/shared";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function ExportProductsButton() {
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const { toastError, toastSuccess } = useToast();

    const handleExport = async () => {
        setLoading(true);
        try {
            // Pass current filters to export
            const params = new URLSearchParams();
            const q = searchParams.get("q");
            const category = searchParams.get("category");
            if (q) params.set("q", q);
            if (category) params.set("category", category);

            const res = await fetch(`/api/products/export?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch products");
            const products = await res.json();

            if (products.length === 0) {
                toastError("ไม่พบสินค้าสำหรับ export");
                return;
            }

            // Dynamic import xlsx
            const XLSX = await import("xlsx");

            // Prepare data for Excel
            const rows = products.map((p: any, i: number) => ({
                "ลำดับ": i + 1,
                "บาร์โค้ด": p.barcode,
                "รหัสสินค้า": p.code,
                "ชื่อสินค้า": p.name,
                "ไซส์": p.size,
                "สี": p.color,
                "หมวดหมู่": p.category,
                "ราคาขาย": p.price,
                "สต็อกคลัง": p.stock,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);

            // Set column widths
            ws["!cols"] = [
                { wch: 6 },   // ลำดับ
                { wch: 18 },  // บาร์โค้ด
                { wch: 12 },  // รหัสสินค้า
                { wch: 30 },  // ชื่อสินค้า
                { wch: 8 },   // ไซส์
                { wch: 12 },  // สี
                { wch: 15 },  // หมวดหมู่
                { wch: 12 },  // ราคาขาย
                { wch: 10 },  // สต็อกคลัง
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สินค้า");

            // Generate filename with date
            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `products_${dateStr}.xlsx`);

            toastSuccess(`Export สำเร็จ ${products.length} รายการ`);
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
            {loading ? (
                <Spinner size="sm" />
            ) : (
                <FileSpreadsheet className="h-4 w-4" />
            )}
            {loading ? "กำลัง Export..." : "Export Excel"}
        </button>
    );
}
