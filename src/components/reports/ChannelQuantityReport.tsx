"use client";

import { useState } from "react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { Package, Hash, Download, FileSpreadsheet } from "lucide-react";

interface Channel {
    id: string;
    name: string;
    code: string;
    type: string;
    totalQty: number;
    billCount: number;
}

interface Props {
    data: Channel[];
    from: string;
    to: string;
    channelId: string;
    channelType: string;
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200">
            <p className="text-xs font-bold text-slate-900">{d.name}</p>
            <p className="text-[10px] text-slate-400">{d.code}</p>
            <div className="mt-1.5">
                <p className="text-xs text-blue-600 font-semibold">{fmt(d.totalQty)} ชิ้น</p>
                <p className="text-[10px] text-slate-500">{d.billCount} บิล</p>
            </div>
        </div>
    );
}

export function ChannelQuantityReport({ data, from, to, channelId, channelType }: Props) {
    const [exportingDetail, setExportingDetail] = useState(false);
    const totalQty = data.reduce((s, c) => s + c.totalQty, 0);
    const totalBills = data.reduce((s, c) => s + c.billCount, 0);

    const chartData = data.filter((c) => c.totalQty > 0).map((c) => ({
        ...c,
        label: c.code,
    }));

    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            const rows = data.map((c, i) => ({
                "ลำดับ": i + 1,
                "ชื่อสาขา/Event": c.name,
                "รหัส": c.code,
                "ประเภท": c.type === 'EVENT' ? 'Event' : 'Branch',
                "จำนวนชิ้น": c.totalQty,
                "จำนวนบิล": c.billCount,
                "เฉลี่ยชิ้น/บิล": c.billCount > 0 ? Number((c.totalQty / c.billCount).toFixed(1)) : 0
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "จำนวนขายสาขา");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `channel_quantity_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        }
    };

    const handleExportDetail = async () => {
        setExportingDetail(true);
        try {
            const res = await fetch(`/api/reports/quantity-detail?from=${from}&to=${to}&channelId=${channelId}&channelType=${channelType}`);
            if (!res.ok) throw new Error("Failed to fetch detail");
            const json = await res.json();
            const detail: any[] = json.data;

            const XLSX = await import("xlsx");
            const rows = detail.map((r, i) => ({
                "ลำดับ": i + 1,
                "สาขา/Event": r.channelName,
                "รหัสสาขา": r.channelCode,
                "ประเภท": r.channelType === 'EVENT' ? 'Event' : 'Branch',
                "รหัสสินค้า": r.productCode,
                "ชื่อสินค้า": r.productName,
                "สี": r.productColor,
                "ไซส์": r.productSize,
                "จำนวนที่ขาย (ชิ้น)": r.qtySold,
            }));
            const ws = XLSX.utils.json_to_sheet(rows);

            // Auto-width columns
            const colWidths = Object.keys(rows[0] || {}).map((key) => {
                const maxLen = Math.max(
                    key.length,
                    ...rows.map((r) => String((r as any)[key] ?? "").length)
                );
                return { wch: Math.min(maxLen + 2, 40) };
            });
            ws["!cols"] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "รายรุ่นที่ขาย");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `quantity_by_model_${dateStr}.xlsx`);
        } catch (err) {
            console.error("Export detail failed", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        } finally {
            setExportingDetail(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Package className="h-3 w-3" /> ขายทั้งหมด</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalQty)} ชิ้น</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Hash className="h-3 w-3" /> จำนวนบิล</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalBills)}</p>
                </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">📦 จำนวนสินค้าที่ขายแต่ละสาขา</h3>
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
                                <Bar dataKey="totalQty" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">รายละเอียดจำนวนขายแต่ละสาขา</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportDetail}
                            disabled={exportingDetail}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <FileSpreadsheet className={`h-3.5 w-3.5 ${exportingDetail ? 'animate-spin' : ''}`} />
                            {exportingDetail ? 'กำลังโหลด...' : 'ส่งออก Excel (รายรุ่น)'}
                        </button>
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
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
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">ชื่อสาขา / Event</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-left bg-slate-50">รหัส</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-center w-24 bg-slate-50">ประเภท</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">จำนวนชิ้น</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">จำนวนบิล</th>
                                <th className="border border-slate-200 py-2.5 px-3 text-right bg-slate-50">เฉลี่ย/บิล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((c, i) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors text-slate-800">
                                    <td className="border border-slate-200 py-2 px-3 text-center text-slate-500 font-mono">{i + 1}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-medium text-slate-900">{c.name}</td>
                                    <td className="border border-slate-200 py-2 px-3 font-mono text-slate-600">{c.code}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-center">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            c.type === 'EVENT' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'
                                        }`}>
                                            {c.type === 'EVENT' ? 'Event 🎪' : 'Branch 🏪'}
                                        </span>
                                    </td>
                                    <td className="border border-slate-200 py-2 px-3 text-right font-bold text-blue-600 font-mono">{fmt(c.totalQty)}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right text-slate-600 font-mono">{c.billCount}</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right text-slate-500 font-mono">
                                        {c.billCount > 0 ? (c.totalQty / c.billCount).toFixed(1) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 font-bold text-slate-900">
                                <td colSpan={4} className="border border-slate-200 py-2.5 px-3 text-slate-700 text-center font-medium">รวมทั้งหมด</td>
                                <td className="border border-slate-200 py-2.5 px-3 text-right text-blue-700 font-mono">{fmt(totalQty)}</td>
                                <td className="border border-slate-200 py-2.5 px-3 text-right text-slate-700 font-mono">{totalBills}</td>
                                <td className="border border-slate-200 py-2.5 px-3 text-right text-slate-500 font-mono">
                                    {totalBills > 0 ? (totalQty / totalBills).toFixed(1) : '—'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
