"use client";

import { useState, useMemo, useEffect } from "react";
import { Package, Warehouse, Store, Search, Download, Hash } from "lucide-react";

interface TotalStockItem {
    code: string | null;
    name: string;
    color: string | null;
    size: string | null;
    warehouseQty: number;
    channelQty: number;
    totalQty: number;
}

interface Props {
    data: TotalStockItem[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

export function TotalStockReport({ data }: Props) {
    const [search, setSearch] = useState("");
    const [displayLimit, setDisplayLimit] = useState(50);

    // Reset display limit when searching to keep interaction fast
    useEffect(() => {
        setDisplayLimit(50);
    }, [search]);

    // Filter flat data directly
    const filteredItems = useMemo(() => {
        if (!search) return data;
        const q = search.toLowerCase();
        return data.filter(
            (item) =>
                (item.code || "").toLowerCase().includes(q) ||
                item.name.toLowerCase().includes(q) ||
                (item.color || "").toLowerCase().includes(q) ||
                (item.size || "").toLowerCase().includes(q)
        );
    }, [data, search]);

    // Slice for lazy rendering in the browser DOM
    const displayedItems = useMemo(() => {
        return filteredItems.slice(0, displayLimit);
    }, [filteredItems, displayLimit]);

    const totalWarehouse = data.reduce((s, i) => s + i.warehouseQty, 0);
    const totalChannel = data.reduce((s, i) => s + i.channelQty, 0);
    const totalAll = data.reduce((s, i) => s + i.totalQty, 0);

    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rows: any[] = [];
            data.forEach((item) => {
                rows.push({
                    "รหัส": item.code || "-",
                    "ชื่อสินค้า": item.name,
                    "สี": item.color || "-",
                    "ไซส์": item.size || "-",
                    "คงเหลือรวม": item.totalQty,
                });
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "คงเหลือรวม");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `total_stock_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Warehouse className="h-3 w-3" /> คลังสินค้า</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalWarehouse)}</p>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Store className="h-3 w-3" /> สาขา/Event</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalChannel)}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Package className="h-3 w-3" /> คงเหลือรวมทั้งหมด</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalAll)}</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                <Package className="h-4 w-4" />
                ข้อมูลสต็อกคงเหลือรวม (คลังสินค้า + สาขา/Event ที่ยังไม่ขาย) — Real-time
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">สรุปสินค้าคงเหลือรวม</h3>
                        <span className="text-[10px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full font-medium">REAL-TIME</span>
                        <span className="text-[10px] text-slate-400 font-medium">แสดง {displayedItems.length} จาก {filteredItems.length} รายการ</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหารหัส ชื่อ สี ไซส์..."
                                className="h-8 w-full sm:w-52 pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0"
                        >
                            <Download className="h-3.5 w-3.5" />
                            ส่งออก Excel
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                            <tr className="bg-slate-50/70 text-slate-700 font-semibold">
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-12 bg-slate-50">ลำดับ</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">รหัส</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">ชื่อสินค้า</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-24 bg-slate-50">สี</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-20 bg-slate-50">ไซส์</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">คงเหลือรวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-slate-800">
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{item.code || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-medium text-slate-900">{item.name}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-600">{item.color || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-600">{item.size || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right font-bold text-violet-600 font-mono">{fmt(item.totalQty)}</td>
                                </tr>
                            ))}

                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 border border-slate-200">
                                        <div className="flex flex-col items-center justify-center">
                                            <Hash className="h-8 w-8 text-slate-300 mb-2" />
                                            <p className="text-sm">ไม่พบข้อมูลสินค้าที่ค้นหา</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Load More Button */}
                {filteredItems.length > displayLimit && (
                    <div className="flex flex-col items-center justify-center py-4 border-t border-slate-100 bg-slate-50/30">
                        <button
                            onClick={() => setDisplayLimit((prev) => prev + 50)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 shadow-sm transition-all active:scale-[0.98]"
                        >
                            แสดงเพิ่มเติม (+50 รายการ)
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            แสดงอยู่ {displayedItems.length} จากทั้งหมด {filteredItems.length} รายการ
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
