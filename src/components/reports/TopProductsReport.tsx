"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Trophy, TrendingUp, Hash, Download, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Product {
    barcode: string;
    name: string;
    code: string | null;
    sku?: string | null;
    size: string | null;
    color: string | null;
    qtySold: number;
    revenue: number;
    billCount: number;
    channelsSold?: string;
}

interface Props {
    data: Product[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

const SIZE_ORDER: Record<string, number> = {
    XXS: 1,
    XS: 2,
    S: 3,
    M: 4,
    L: 5,
    XL: 6,
    XXL: 7,
    "2XL": 7,
    "3XL": 8,
    XXXL: 8,
    "4XL": 9,
    "5XL": 10,
    F: 20,
    FREE: 20,
    FREESIZE: 20,
};

function getSizeRank(size: string | null | undefined, sku?: string | null, barcode?: string): number {
    const raw = size && size !== "-" ? size.trim().toUpperCase() : "";
    if (raw && SIZE_ORDER[raw] !== undefined) return SIZE_ORDER[raw];
    if (raw) {
        const num = Number(raw);
        if (!Number.isNaN(num)) return 100 + num;
    }

    // Fallback: inspect last token of SKU or barcode (e.g. SR102-Grey-2XL -> 2XL)
    const ref = (sku && sku !== "-" ? sku : barcode) || "";
    const lastPart = ref.split("-").pop()?.trim().toUpperCase() || "";
    if (SIZE_ORDER[lastPart] !== undefined) return SIZE_ORDER[lastPart];
    if (lastPart) {
        const lastNum = Number(lastPart);
        if (!Number.isNaN(lastNum)) return 100 + lastNum;
    }

    return raw ? 500 : 999;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200 max-w-[240px]">
            <p className="text-xs font-bold text-slate-900 truncate">
                รุ่น {d.label} <span className="font-normal text-slate-500">({d.name})</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
                รวมทุกสี ({d.colorCount > 0 ? `${d.colorCount} สี` : "ไม่ระบุสี"} · {d.skuCount} SKU)
            </p>
            <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-blue-600 font-bold">รวม {fmt(d.qtySold)} ชิ้น</p>
                <p className="text-xs text-emerald-600 font-semibold">฿{fmt(d.revenue)}</p>
            </div>
        </div>
    );
}

export function TopProductsReport({ data }: Props) {
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [chartMetric, setChartMetric] = useState<"qty" | "revenue">("qty");

    // Reset to page 1 on search or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    const totalRevenue = data.reduce((s, p) => s + p.revenue, 0);
    const totalQty = data.reduce((s, p) => s + p.qtySold, 0);

    // Aggregate totals by model (code) and by (code + color)
    const { chartData, modelTotals, colorGroupTotals } = useMemo(() => {
        const modelMap = new Map<
            string,
            {
                code: string;
                label: string;
                name: string;
                qtySold: number;
                revenue: number;
                colors: Set<string>;
                skuCount: number;
            }
        >();
        const colorTotals = new Map<string, { qtySold: number; revenue: number }>();

        for (const p of data) {
            const rawCode = p.code && p.code !== "-" ? p.code.trim() : p.barcode.trim();
            const modelKey = rawCode.toUpperCase();
            if (!modelMap.has(modelKey)) {
                modelMap.set(modelKey, {
                    code: rawCode,
                    label: rawCode,
                    name: p.name,
                    qtySold: 0,
                    revenue: 0,
                    colors: new Set<string>(),
                    skuCount: 0,
                });
            }
            const entry = modelMap.get(modelKey)!;
            entry.qtySold += p.qtySold;
            entry.revenue += p.revenue;
            entry.skuCount += 1;
            if (p.color && p.color !== "-") {
                entry.colors.add(p.color.trim());
            }

            const colorKey = `${modelKey}__${(p.color || "-").trim().toUpperCase()}`;
            const prevColor = colorTotals.get(colorKey) || { qtySold: 0, revenue: 0 };
            prevColor.qtySold += p.qtySold;
            prevColor.revenue += p.revenue;
            colorTotals.set(colorKey, prevColor);
        }

        const aggregatedModels = Array.from(modelMap.values())
            .map((item) => ({
                ...item,
                colorCount: item.colors.size,
            }))
            .sort((a, b) =>
                chartMetric === "qty"
                    ? b.qtySold - a.qtySold || b.revenue - a.revenue
                    : b.revenue - a.revenue || b.qtySold - a.qtySold
            )
            .slice(0, 15);

        return {
            chartData: aggregatedModels,
            modelTotals: modelMap,
            colorGroupTotals: colorTotals,
        };
    }, [data, chartMetric]);

    // Filter and sort data:
    // 1. Group by model (code) — ordered by model total sales
    // 2. Within each model, group clearly by color (color)
    // 3. Within each color group, sort sizes from S -> 3XL
    const filteredData = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = !q
            ? [...data]
            : data.filter(
                  (p) =>
                      p.name.toLowerCase().includes(q) ||
                      (p.code || "").toLowerCase().includes(q) ||
                      (p.sku || "").toLowerCase().includes(q) ||
                      p.barcode.toLowerCase().includes(q) ||
                      (p.size || "").toLowerCase().includes(q) ||
                      (p.color || "").toLowerCase().includes(q)
              );

        return filtered.sort((a, b) => {
            const codeA = (a.code && a.code !== "-" ? a.code.trim() : a.barcode.trim()).toUpperCase();
            const codeB = (b.code && b.code !== "-" ? b.code.trim() : b.barcode.trim()).toUpperCase();

            // 1. Keep same model (code) together, ordered by model total qtySold DESC then code ASC
            if (codeA !== codeB) {
                const totalA = modelTotals.get(codeA)?.qtySold || 0;
                const totalB = modelTotals.get(codeB)?.qtySold || 0;
                if (totalB !== totalA) return totalB - totalA;
                return codeA.localeCompare(codeB, "th");
            }

            // 2. Within same model, group by color clearly
            const colorA = (a.color || "-").trim();
            const colorB = (b.color || "-").trim();
            const colorKeyA = colorA.toUpperCase();
            const colorKeyB = colorB.toUpperCase();
            if (colorKeyA !== colorKeyB) {
                const cTotalA = colorGroupTotals.get(`${codeA}__${colorKeyA}`)?.qtySold || 0;
                const cTotalB = colorGroupTotals.get(`${codeB}__${colorKeyB}`)?.qtySold || 0;
                if (cTotalB !== cTotalA) return cTotalB - cTotalA;
                return colorA.localeCompare(colorB, "th");
            }

            // 3. Within same model + color, sort by size from S -> 3XL
            const sizeRankA = getSizeRank(a.size, a.sku, a.barcode);
            const sizeRankB = getSizeRank(b.size, b.sku, b.barcode);
            if (sizeRankA !== sizeRankB) return sizeRankA - sizeRankB;

            return (a.sku || a.barcode).localeCompare(b.sku || b.barcode, "th");
        });
    }, [data, search, modelTotals, colorGroupTotals]);

    // Paginate the filtered data
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);
            
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);
            
            if (currentPage <= 2) {
                end = 4;
            } else if (currentPage >= totalPages - 1) {
                start = totalPages - 3;
            }
            
            if (start > 2) {
                pages.push("...");
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (end < totalPages - 1) {
                pages.push("...");
            }
            
            pages.push(totalPages);
        }
        
        return pages;
    };

    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            const rows = filteredData.map((p, i) => ({
                "ลำดับ": i + 1,
                "บาร์โค้ด": p.barcode,
                "ชื่อสินค้า": p.name,
                "รหัส": p.code || "-",
                "SKU": p.sku || "-",
                "ไซส์": p.size || "-",
                "สี": p.color || "-",
                "จำนวนชิ้น": p.qtySold,
                "ยอดเงิน (บาท)": p.revenue,
                "จำนวนบิล": p.billCount,
                "จุดขาย (สาขา/Event)": p.channelsSold || "-",
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สินค้าที่ขายทั้งหมด");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `sold_products_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> ยอดขายรวม</p>
                    <p className="text-xl font-bold mt-1">฿{fmt(totalRevenue)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Hash className="h-3 w-3" /> จำนวนชิ้น</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalQty)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg hidden sm:block">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Trophy className="h-3 w-3" /> สินค้าทั้งหมด</p>
                    <p className="text-xl font-bold mt-1">{data.length} รายการ</p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                🏆 Top 15 รุ่นสินค้าขายดี (รวมทุกสี/ทุกไซส์ของรุ่นนั้นๆ)
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                คำนวณรวมจำนวนที่ขายทั้งหมดทุกสีของแต่ละรุ่น เรียงลำดับจากมากไปน้อย
                            </p>
                        </div>
                        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setChartMetric("qty")}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                    chartMetric === "qty"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                เรียงตามจำนวนชิ้น
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartMetric("revenue")}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                    chartMetric === "revenue"
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                เรียงตามยอดเงิน
                            </button>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    tickFormatter={(v) =>
                                        chartMetric === "revenue" && v >= 1000
                                            ? `${(v / 1000).toFixed(0)}K`
                                            : fmt(Number(v))
                                    }
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={55}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey={chartMetric === "qty" ? "qtySold" : "revenue"}
                                    fill="#10b981"
                                    radius={[0, 6, 6, 0]}
                                    barSize={16}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">รายละเอียดสินค้าที่ขายทั้งหมด</h3>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            แสดง {filteredData.length} รายการ
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            จัดกลุ่มตามรุ่น/สี · เรียงไซส์ S → 3XL
                        </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        {/* Page Size Selector */}
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            className="h-8 text-xs border border-slate-200 rounded-lg bg-white px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-slate-600"
                        >
                            <option value={10}>10 รายการ / หน้า</option>
                            <option value={25}>25 รายการ / หน้า</option>
                            <option value={50}>50 รายการ / หน้า</option>
                            <option value={100}>100 รายการ / หน้า</option>
                        </select>

                        {/* Search Input */}
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหา ชื่อ รหัส SKU ไซส์ สี..."
                                className="h-8 w-full sm:w-48 pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                            />
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm flex-shrink-0"
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
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">บาร์โค้ด</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">ชื่อสินค้า</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">รหัส</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">SKU</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-16 bg-slate-50">ไซส์</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-20 bg-slate-50">สี</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">จำนวนชิ้น</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">ยอดเงิน</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">จำนวนบิล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((p, i) => {
                                const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;
                                const curCode = (p.code && p.code !== "-" ? p.code.trim() : p.barcode.trim()).toUpperCase();
                                const curColor = (p.color || "-").trim();
                                const curGroupKey = `${curCode}__${curColor.toUpperCase()}`;

                                const prev = i > 0 ? paginatedData[i - 1] : null;
                                const prevCode = prev
                                    ? (prev.code && prev.code !== "-" ? prev.code.trim() : prev.barcode.trim()).toUpperCase()
                                    : null;
                                const prevColor = prev ? (prev.color || "-").trim() : null;
                                const prevGroupKey = prev ? `${prevCode}__${prevColor?.toUpperCase()}` : null;

                                const isNewGroup = curGroupKey !== prevGroupKey;
                                const groupSummary = colorGroupTotals.get(curGroupKey);

                                return (
                                    <Fragment key={p.barcode}>
                                        {isNewGroup && (
                                            <tr className="bg-emerald-50/60 border-t-2 border-emerald-200/80">
                                                <td colSpan={7} className="border border-slate-200 py-1.5 px-3 text-left">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-emerald-900 font-mono">
                                                            รุ่น: {p.code || p.barcode}
                                                        </span>
                                                        <span className="text-slate-500">({p.name})</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                                                            สี: {curColor}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-200 py-1.5 px-3 text-right font-bold text-emerald-800 font-mono">
                                                    {groupSummary ? `${fmt(groupSummary.qtySold)} ชิ้น` : ""}
                                                </td>
                                                <td className="border border-slate-200 py-1.5 px-3 text-right font-bold text-emerald-800 font-mono">
                                                    {groupSummary ? `฿${fmt(groupSummary.revenue)}` : ""}
                                                </td>
                                                <td className="border border-slate-200 py-1.5 px-3" />
                                            </tr>
                                        )}
                                        <tr className="hover:bg-slate-50/70 transition-colors text-slate-800">
                                            <td className="border border-slate-200 py-2 px-3 text-center text-slate-500 font-mono">{globalIndex}</td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{p.barcode}</td>
                                            <td className="border border-slate-200 py-2 px-3 font-medium text-slate-900 truncate max-w-[200px]">{p.name}</td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{p.code || "-"}</td>
                                            <td className="border border-slate-200 py-2 px-3 font-mono font-medium text-indigo-700">{p.sku || "-"}</td>
                                            <td className="border border-slate-200 py-2 px-3 text-center font-semibold text-slate-700 bg-slate-50/40">{p.size || "-"}</td>
                                            <td className="border border-slate-200 py-2 px-3 text-center text-slate-700">{p.color || "-"}</td>
                                            <td className="border border-slate-200 py-2 px-3 text-right font-semibold text-slate-700 font-mono">{fmt(p.qtySold)}</td>
                                            <td className="border border-slate-200 py-2 px-3 text-right font-bold text-slate-800 font-mono">{fmt(p.revenue)}</td>
                                            <td className="border border-slate-200 py-2 px-3 text-right text-slate-500 font-mono">{p.billCount}</td>
                                        </tr>
                                    </Fragment>
                                );
                            })}

                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 border border-slate-200">
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/30 text-xs text-slate-500">
                        <div>
                            แสดง {Math.min(filteredData.length, (currentPage - 1) * itemsPerPage + 1)} ถึง{" "}
                            {Math.min(filteredData.length, currentPage * itemsPerPage)} จากทั้งหมด{" "}
                            {filteredData.length} รายการ
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            {getPageNumbers().map((page, idx) => (
                                typeof page === "number" ? (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(page)}
                                        className={`min-w-[28px] h-7 px-1.5 rounded-lg border transition-all ${
                                            currentPage === page
                                                ? "bg-emerald-600 border-emerald-600 text-white font-semibold"
                                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ) : (
                                    <span key={idx} className="px-1 text-slate-400 select-none">
                                        {page}
                                    </span>
                                )
                            ))}

                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
