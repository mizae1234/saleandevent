"use client";

import { useState, useMemo } from "react";
import { Package, Warehouse, Store, Search, Download, ChevronDown, ChevronRight, Hash } from "lucide-react";

interface TotalStockItem {
    code: string | null;
    name: string;
    color: string | null;
    size: string | null;
    warehouseQty: number;
    channelQty: number;
    totalQty: number;
}

interface TotalStockGroup {
    code: string;
    name: string;
    items: TotalStockItem[];
    totalWarehouse: number;
    totalChannel: number;
    totalAll: number;
}

interface Props {
    data: TotalStockItem[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

export function TotalStockReport({ data }: Props) {
    const [search, setSearch] = useState("");
    const [expandedCode, setExpandedCode] = useState<string | null>(null);

    // Group by product code+name
    const groups = useMemo(() => {
        const map = new Map<string, TotalStockGroup>();
        data.forEach((item) => {
            const key = item.code || item.name;
            if (!map.has(key)) {
                map.set(key, {
                    code: item.code || "-",
                    name: item.name,
                    items: [],
                    totalWarehouse: 0,
                    totalChannel: 0,
                    totalAll: 0,
                });
            }
            const group = map.get(key)!;
            group.items.push(item);
            group.totalWarehouse += item.warehouseQty;
            group.totalChannel += item.channelQty;
            group.totalAll += item.totalQty;
        });
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [data]);

    // Filter
    const filtered = useMemo(() => {
        if (!search) return groups;
        const q = search.toLowerCase();
        return groups.filter(
            (g) =>
                g.code.toLowerCase().includes(q) ||
                g.name.toLowerCase().includes(q) ||
                g.items.some(
                    (i) =>
                        (i.color || "").toLowerCase().includes(q) ||
                        (i.size || "").toLowerCase().includes(q)
                )
        );
    }, [groups, search]);

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
                    "คลังสินค้า": item.warehouseQty,
                    "สาขา/Event": item.channelQty,
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
                        <span className="text-[10px] text-slate-400 font-medium">{filtered.length} กลุ่ม · {data.length} รายการ</span>
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

                <div className="divide-y divide-slate-50">
                    {filtered.map((group) => {
                        const isExpanded = expandedCode === group.code;
                        return (
                            <div key={group.code}>
                                {/* Group Header Row */}
                                <button
                                    onClick={() => setExpandedCode(isExpanded ? null : group.code)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
                                >
                                    {isExpanded
                                        ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-medium">{group.code}</span>
                                            <span className="font-medium text-sm text-slate-900 truncate">{group.name}</span>
                                            <span className="text-[10px] text-slate-400">{group.items.length} ตัวเลือก</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-indigo-400">คลัง</span>{" "}
                                            <span className="font-semibold text-indigo-700">{fmt(group.totalWarehouse)}</span>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <span className="text-teal-400">สาขา</span>{" "}
                                            <span className="font-semibold text-teal-700">{fmt(group.totalChannel)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-violet-400">รวม</span>{" "}
                                            <span className="font-bold text-violet-700">{fmt(group.totalAll)}</span>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Items */}
                                {isExpanded && group.items.length > 0 && (
                                    <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-slate-400">
                                                    <th className="text-left py-1.5 font-medium">สี</th>
                                                    <th className="text-left py-1.5 font-medium">ไซส์</th>
                                                    <th className="text-right py-1.5 font-medium">คลังสินค้า</th>
                                                    <th className="text-right py-1.5 font-medium">สาขา/Event</th>
                                                    <th className="text-right py-1.5 font-medium">คงเหลือรวม</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map((item, idx) => (
                                                    <tr key={idx} className="border-t border-slate-100/50">
                                                        <td className="py-1.5 text-slate-700">{item.color || "-"}</td>
                                                        <td className="py-1.5 text-slate-700">{item.size || "-"}</td>
                                                        <td className="py-1.5 text-right text-indigo-600 font-medium">{fmt(item.warehouseQty)}</td>
                                                        <td className="py-1.5 text-right text-teal-600 font-medium">{fmt(item.channelQty)}</td>
                                                        <td className="py-1.5 text-right font-bold text-violet-600">{fmt(item.totalQty)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-slate-400">
                            <Hash className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">ไม่พบข้อมูลสินค้าที่ค้นหา</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
