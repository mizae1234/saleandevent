"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/shared";

type ExportRow = {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, number>;
    total: number;
};

type Props = {
    rows: ExportRow[];
    sizeTotals: Record<string, number>;
    totalReturn: number;
    eventCode: string;
    eventName: string;
};

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

export function ExportReturnExcel({ rows, sizeTotals, totalReturn, eventCode, eventName }: Props) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (rows.length === 0) return;
        setExporting(true);
        try {
            const XLSX = await import("xlsx");

            const sheetData = rows.map(row => {
                const obj: Record<string, string | number> = {
                    "#": row.no,
                    "ประเภท": row.producttype,
                    "รุ่น": row.code,
                    "สี": row.color,
                };
                for (const s of SIZES) {
                    obj[s] = row.sizes[s] || 0;
                }
                obj["รวม"] = row.total;
                return obj;
            });

            // Add totals row
            const totalsRow: Record<string, string | number> = {
                "#": "",
                "ประเภท": "",
                "รุ่น": "",
                "สี": "รวมทั้งหมด",
            };
            for (const s of SIZES) {
                totalsRow[s] = sizeTotals[s] || 0;
            }
            totalsRow["รวม"] = totalReturn;
            sheetData.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(sheetData);
            ws["!cols"] = [
                { wch: 5 },   // #
                { wch: 14 },  // ประเภท
                { wch: 14 },  // รุ่น
                { wch: 10 },  // สี
                { wch: 6 },   // S
                { wch: 6 },   // M
                { wch: 6 },   // L
                { wch: 6 },   // XL
                { wch: 6 },   // 2XL
                { wch: 6 },   // 3XL
                { wch: 8 },   // รวม
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รับคืนสินค้า");

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `return_${eventCode}_${dateStr}.xlsx`);
        } catch {
            console.error("Export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
            {exporting ? <Spinner size="xs" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            {exporting ? "กำลัง Export..." : "Export Excel"}
        </button>
    );
}
