"use client";

import { useState, useMemo } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { Package, Truck, ShoppingCart, ChevronDown, ChevronRight, EyeOff, Download, Filter } from "lucide-react";
import { getChannelStatus } from "@/config/status";

interface StockItem {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
    color: string | null;
    sent: number;
    sold: number;
    returned: number;
    remaining: number;
}

interface ChannelStock {
    id: string;
    name: string;
    code: string;
    type: string;
    status: string;
    isActive: boolean;
    totalSent: number;
    totalSold: number;
    totalReturned: number;
    totalRemaining: number;
    soldPercent: number;
    items: StockItem[];
}

interface Props {
    data: ChannelStock[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200">
            <p className="text-xs font-bold text-slate-900">{d.name}</p>
            <div className="mt-1.5 space-y-0.5 text-[10px]">
                <p className="text-blue-600">ส่งไป: {fmt(d.totalSent)}</p>
                <p className="text-emerald-600">ขายแล้ว: {fmt(d.totalSold)}</p>
                <p className="text-amber-600">คงเหลือ: {fmt(d.totalRemaining)}</p>
                {d.totalReturned > 0 && <p className="text-purple-600">คืนแล้ว: {fmt(d.totalReturned)}</p>}
            </div>
        </div>
    );
}

export function ChannelStockReport({ data }: Props) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');

    // Dynamic status tabs from data
    const statusTabs = useMemo(() => {
        const counts = new Map<string, number>();
        data.forEach(c => {
            counts.set(c.status, (counts.get(c.status) || 0) + 1);
        });
        const tabs: { key: string; label: string; count: number }[] = [{ key: 'all', label: 'ทั้งหมด', count: data.length }];
        counts.forEach((count, status) => {
            const config = getChannelStatus(status);
            tabs.push({ key: status, label: config.label, count });
        });
        return tabs;
    }, [data]);

    // Filter data by channel status
    const filteredData = useMemo(() => {
        if (statusFilter === 'all') return data;
        return data.filter(c => c.status === statusFilter);
    }, [data, statusFilter]);

    const totalSent = filteredData.reduce((s, c) => s + c.totalSent, 0);
    const totalSold = filteredData.reduce((s, c) => s + c.totalSold, 0);
    const totalRemaining = filteredData.reduce((s, c) => s + c.totalRemaining, 0);

    const chartData = filteredData
        .filter((c) => c.totalSent > 0)
        .map((c) => ({
            ...c,
            label: c.code,
        }));

    const itemMap = new Map<string, any>();
    filteredData.filter(c => c.totalSent > 0).forEach(c => {
        c.items.forEach(item => {
            if (!itemMap.has(item.barcode)) {
                itemMap.set(item.barcode, {
                    barcode: item.barcode,
                    name: item.name,
                    code: item.code,
                    size: item.size,
                    color: item.color,
                    sent: 0,
                    sold: 0,
                    returned: 0,
                    remaining: 0
                });
            }
            const agg = itemMap.get(item.barcode);
            agg.sent += item.sent;
            agg.sold += item.sold;
            agg.returned += item.returned;
            agg.remaining += item.remaining;
        });
    });
    const aggregatedItems = Array.from(itemMap.values()).sort((a, b) => b.remaining - a.remaining);

    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            const rows: any[] = [];
            filteredData.filter(c => c.totalSent > 0).forEach((c, i) => {
                c.items.forEach((item) => {
                    rows.push({
                        "ลำดับสาขา": i + 1,
                        "ชื่อสาขา/Event": c.name,
                        "บาร์โค้ด": item.barcode,
                        "ชื่อสินค้า": item.name,
                        "รหัส": item.code || "-",
                        "ไซส์": item.size || "-",
                        "สี": item.color || "-",
                        "ส่งไป": item.sent,
                        "ขายแล้ว": item.sold,
                        "คืนแล้ว": item.returned,
                        "คงเหลือ": item.remaining,
                    });
                });
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สินค้าคงเหลือ");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `channel_stock_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Truck className="h-3 w-3" /> ส่งไปทั้งหมด</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalSent)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> ขายแล้ว</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalSold)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Package className="h-3 w-3" /> คงเหลือ</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalRemaining)}</p>
                </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                >
                    {statusTabs.map(tab => (
                        <option key={tab.key} value={tab.key}>
                            {tab.label} ({tab.count})
                        </option>
                    ))}
                </select>
                {statusFilter !== 'all' && (
                    <button
                        onClick={() => setStatusFilter('all')}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ล้าง
                    </button>
                )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">📊 สินค้าคงเหลือแต่ละสาขา (Real-time)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: "#64748b" }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={40}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11 }}
                                    formatter={(value) => {
                                        const labels: Record<string, string> = { totalSold: "ขายแล้ว", totalRemaining: "คงเหลือ" };
                                        return labels[value] || value;
                                    }}
                                />
                                <Bar dataKey="totalSold" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={28} />
                                <Bar dataKey="totalRemaining" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Expandable Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">รายละเอียดสต็อกแต่ละสาขา</h3>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">REAL-TIME</span>
                    </div>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Download className="h-3.5 w-3.5" />
                        ส่งออก Excel
                    </button>
                </div>
                <div className="divide-y divide-slate-50">
                    {filteredData.filter((c) => c.totalSent > 0).map((channel) => {
                        const isExpanded = expandedId === channel.id;
                        const status = getChannelStatus(channel.status);

                        return (
                            <div key={channel.id}>
                                {/* Channel Row */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : channel.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
                                >
                                    {isExpanded
                                        ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-slate-900 truncate">{channel.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{channel.code}</span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                            {!channel.isActive && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-red-50 text-red-500 flex items-center gap-0.5">
                                                    <EyeOff className="h-2.5 w-2.5" /> ปิดใช้งาน
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-slate-400">ส่ง</span>{" "}
                                            <span className="font-semibold text-slate-700">{fmt(channel.totalSent)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-emerald-500">ขาย</span>{" "}
                                            <span className="font-semibold text-emerald-700">{fmt(channel.totalSold)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-amber-500">เหลือ</span>{" "}
                                            <span className="font-bold text-amber-700">{fmt(channel.totalRemaining)}</span>
                                        </div>
                                        <div className="w-16 hidden sm:block">
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500"
                                                    style={{ width: `${channel.soldPercent}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-400 text-center mt-0.5">{channel.soldPercent}%</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Items */}
                                {isExpanded && channel.items.length > 0 && (
                                    <div className="bg-slate-50/50 border-t border-slate-100 p-3 overflow-x-auto">
                                        <table className="w-full text-xs border-collapse border border-slate-200 bg-white">
                                            <thead>
                                                <tr className="bg-slate-50/70 text-slate-700 font-semibold">
                                                    <th className="border border-slate-200 py-1.5 px-2 text-left bg-slate-50">บาร์โค้ด</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-left bg-slate-50">ชื่อสินค้า</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-left bg-slate-50">รหัส</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-center w-12 bg-slate-50">ไซส์</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-center w-16 bg-slate-50">สี</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-right w-16 bg-slate-50">ส่งไป</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-right w-16 bg-slate-50">ขาย</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-right w-16 bg-slate-50">คืน</th>
                                                    <th className="border border-slate-200 py-1.5 px-2 text-right w-16 bg-slate-50">เหลือ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {channel.items.map((item) => (
                                                    <tr key={item.barcode} className="hover:bg-slate-50/30 transition-colors text-slate-800">
                                                        <td className="border border-slate-200 py-1.5 px-2 font-mono text-slate-500">{item.barcode}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 font-medium text-slate-900">{item.name}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 font-mono text-slate-600">{item.code || "-"}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.size || "-"}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.color || "-"}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-right text-slate-600 font-mono">{fmt(item.sent)}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-right text-emerald-600 font-semibold font-mono">{fmt(item.sold)}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-right text-purple-600 font-mono">{fmt(item.returned)}</td>
                                                        <td className="border border-slate-200 py-1.5 px-2 text-right font-bold text-amber-700 font-mono">{fmt(item.remaining)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Aggregated Items Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">สรุปสินค้าคงเหลือรายตัว (รวมสาขาที่เลือก)</h3>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                            <tr className="bg-slate-50/70 text-slate-700 font-semibold">
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-12 bg-slate-50">ลำดับ</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">บาร์โค้ด</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">ชื่อสินค้า</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">รหัส</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-16 bg-slate-50">ไซส์</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-20 bg-slate-50">สี</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">ส่งไป</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">ขายแล้ว</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">คืนแล้ว</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50 font-bold">คงเหลือ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregatedItems.map((item, i) => (
                                <tr key={item.barcode} className="hover:bg-slate-50/50 transition-colors text-slate-800">
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-500 font-mono">{i + 1}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{item.barcode}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-medium text-slate-900">{item.name}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{item.code || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-600">{item.size || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-600">{item.color || "-"}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right text-slate-600 font-mono">{fmt(item.sent)}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right text-emerald-600 font-semibold font-mono">{fmt(item.sold)}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right text-purple-600 font-mono">{fmt(item.returned)}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right font-bold text-amber-700 font-mono">{fmt(item.remaining)}</td>
                                </tr>
                            ))}
                            {aggregatedItems.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-8 text-center text-slate-400 border border-slate-200">ไม่มีข้อมูลสินค้า</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
