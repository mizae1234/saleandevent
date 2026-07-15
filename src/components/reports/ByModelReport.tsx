"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Download, ChevronDown, ChevronUp, Store, Tag, Package, BarChart2 } from "lucide-react";

interface ModelSaleItem {
    channelId: string;
    channelName: string;
    channelCode: string;
    channelType: string;
    productCode: string;
    productName: string;
    productColor: string;
    productSize: string;
    qtySold: number;
    revenue: number;
}

interface Props {
    data: ModelSaleItem[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

export function ByModelReport({ data, selectedModel, setSelectedModel }: Props) {
    const [searchInput, setSearchInput] = useState(selectedModel);
    const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});

    // Sync input field when selectedModel prop changes
    useEffect(() => {
        setSearchInput(selectedModel);
    }, [selectedModel]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSelectedModel(searchInput.trim());
    };

    // Calculate totals
    const totalQty = useMemo(() => data.reduce((sum, item) => sum + item.qtySold, 0), [data]);
    const totalRevenue = useMemo(() => data.reduce((sum, item) => sum + item.revenue, 0), [data]);
    const uniqueChannelsCount = useMemo(() => new Set(data.map((item) => item.channelId)).size, [data]);

    // Group items by channel for the main table
    const channelSales = useMemo(() => {
        const channelMap: Record<string, {
            channelId: string;
            channelName: string;
            channelCode: string;
            channelType: string;
            totalQty: number;
            totalRevenue: number;
            items: ModelSaleItem[];
        }> = {};

        for (const item of data) {
            if (!channelMap[item.channelId]) {
                channelMap[item.channelId] = {
                    channelId: item.channelId,
                    channelName: item.channelName,
                    channelCode: item.channelCode,
                    channelType: item.channelType,
                    totalQty: 0,
                    totalRevenue: 0,
                    items: [],
                };
            }
            channelMap[item.channelId].totalQty += item.qtySold;
            channelMap[item.channelId].totalRevenue += item.revenue;
            channelMap[item.channelId].items.push(item);
        }

        return Object.values(channelMap).sort((a, b) => b.totalQty - a.totalQty);
    }, [data]);

    const toggleChannel = (channelId: string) => {
        setExpandedChannels((prev) => ({
            ...prev,
            [channelId]: !prev[channelId],
        }));
    };

    const handleExport = async () => {
        if (!selectedModel || data.length === 0) return;
        try {
            const XLSX = await import("xlsx");
            const rows = data.map((item, index) => ({
                "ลำดับ": index + 1,
                "สาขา/Event": item.channelName,
                "รหัสสาขา": item.channelCode,
                "ประเภท": item.channelType === "EVENT" ? "Event" : "Branch",
                "รหัสรุ่น": item.productCode,
                "ชื่อสินค้า": item.productName,
                "สี": item.productColor,
                "ไซส์": item.productSize,
                "จำนวนขาย (ชิ้น)": item.qtySold,
                "ยอดขาย (บาท)": item.revenue,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);

            // Auto-width columns
            const colWidths = Object.keys(rows[0] || {}).map((key) => {
                const maxLen = Math.max(
                    key.length,
                    ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? "").length)
                );
                return { wch: Math.min(maxLen + 2, 40) };
            });
            ws["!cols"] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `รุ่น ${selectedModel}`);
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `sales_model_${selectedModel}_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="พิมพ์รหัสรุ่นสินค้าเพื่อค้นหา (เช่น SR099)"
                            className="h-10 w-full pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-10 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        <Search className="h-4 w-4" />
                        ค้นหา
                    </button>
                </form>
            </div>

            {/* Content Logic */}
            {!selectedModel ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 mb-4">
                        <Tag className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">ระบุรหัสรุ่นสินค้า</h3>
                    <p className="text-xs text-slate-400 mt-1">กรอกรหัสรุ่นด้านบนแล้วกดค้นหา เพื่อเช็คยอดขายแยกตามแต่ละสาขา</p>
                </div>
            ) : data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500 mb-4">
                        <BarChart2 className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">ไม่พบข้อมูลการขาย</h3>
                    <p className="text-xs text-slate-400 mt-1">ไม่มียอดขายสำหรับรุ่น &quot;{selectedModel}&quot; ในช่วงเวลาและฟิลเตอร์ที่เลือก</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                            <p className="text-xs text-white/70 flex items-center gap-1">
                                <BarChart2 className="h-3.5 w-3.5" /> ยอดขายของรุ่น {selectedModel}
                            </p>
                            <p className="text-2xl font-bold mt-1">฿{fmt(totalRevenue)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                            <p className="text-xs text-white/70 flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" /> จำนวนที่ขายได้ทั้งหมด
                            </p>
                            <p className="text-2xl font-bold mt-1">{fmt(totalQty)} ชิ้น</p>
                        </div>
                        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg">
                            <p className="text-xs text-white/70 flex items-center gap-1">
                                <Store className="h-3.5 w-3.5" /> สาขา/Event ที่ขายได้
                            </p>
                            <p className="text-2xl font-bold mt-1">{uniqueChannelsCount} แห่ง</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    สรุปยอดขายแยกรายสาขา (รุ่น: {selectedModel})
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">คลิกที่สาขาเพื่อดูรายละเอียดแยก สี/ไซส์</p>
                            </div>
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Download className="h-3.5 w-3.5" />
                                ส่งออก Excel
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-100">
                                        <th className="py-3 px-4 text-center w-12">ลำดับ</th>
                                        <th className="py-3 px-4 text-left">ชื่อสาขา / Event</th>
                                        <th className="py-3 px-4 text-left">รหัสสาขา</th>
                                        <th className="py-3 px-4 text-center w-24">ประเภท</th>
                                        <th className="py-3 px-4 text-right">จำนวนชิ้น</th>
                                        <th className="py-3 px-4 text-right">ยอดขาย (บาท)</th>
                                        <th className="py-3 px-4 text-center w-16">รายละเอียด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {channelSales.map((c, index) => {
                                        const isExpanded = !!expandedChannels[c.channelId];
                                        return (
                                            <>
                                                <tr
                                                    key={c.channelId}
                                                    onClick={() => toggleChannel(c.channelId)}
                                                    className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 text-slate-800 cursor-pointer"
                                                >
                                                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                                                        {index + 1}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-slate-950">
                                                        {c.channelName}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-600">
                                                        {c.channelCode}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span
                                                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                                                                c.channelType === "EVENT"
                                                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                                                                    : "bg-teal-50 text-teal-700 border border-teal-100"
                                                            }`}
                                                        >
                                                            {c.channelType === "EVENT" ? "Event 🎪" : "Branch 🏪"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-blue-600 font-mono">
                                                        {fmt(c.totalQty)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                                                        {fmt(c.totalRevenue)}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex justify-center text-slate-400">
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${c.channelId}-detail`} className="bg-slate-50/40">
                                                        <td colSpan={7} className="p-0 border-b border-slate-100">
                                                            <div className="px-6 py-3 bg-slate-50/30">
                                                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner bg-white">
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="bg-slate-100/60 text-slate-600 font-medium border-b border-slate-100">
                                                                                <th className="py-2 px-4 text-left">สี</th>
                                                                                <th className="py-2 px-4 text-left">ไซส์</th>
                                                                                <th className="py-2 px-4 text-right w-32">จำนวนขาย</th>
                                                                                <th className="py-2 px-4 text-right w-36">ยอดขาย (บาท)</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {c.items.map((item, idx) => (
                                                                                <tr
                                                                                    key={idx}
                                                                                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30 text-slate-700"
                                                                                >
                                                                                    <td className="py-2 px-4 font-medium">
                                                                                        {item.productColor}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 font-mono text-slate-500">
                                                                                        {item.productSize}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-right font-semibold font-mono text-slate-700">
                                                                                        {fmt(item.qtySold)}
                                                                                    </td>
                                                                                    <td className="py-2 px-4 text-right font-mono text-slate-600">
                                                                                        {fmt(item.revenue)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-100">
                                        <td colSpan={4} className="py-3 px-4 text-center text-slate-600 font-medium">
                                            รวมทั้งหมด
                                        </td>
                                        <td className="py-3 px-4 text-right text-blue-700 font-mono">
                                            {fmt(totalQty)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-950 font-mono">
                                            {fmt(totalRevenue)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
