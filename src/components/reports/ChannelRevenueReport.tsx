"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";
import { TrendingUp, Receipt, Target, Download } from "lucide-react";

interface Channel {
    id: string;
    name: string;
    code: string;
    type: string;
    location: string;
    salesTarget: number;
    totalSales: number;
    billCount: number;
}

interface Props {
    data: Channel[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200 max-w-[220px]">
            <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
            <p className="text-[10px] text-slate-400">{d.code} · {d.location}</p>
            <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-emerald-600 font-semibold">฿{fmt(d.totalSales)}</p>
                <p className="text-[10px] text-slate-500">{d.billCount} บิล</p>
                {d.salesTarget > 0 && (
                    <p className="text-[10px] text-amber-600">เป้า ฿{fmt(d.salesTarget)} ({Math.round((d.totalSales / d.salesTarget) * 100)}%)</p>
                )}
            </div>
        </div>
    );
}

export function ChannelRevenueReport({ data }: Props) {
    const totalSales = data.reduce((s, c) => s + c.totalSales, 0);
    const totalBills = data.reduce((s, c) => s + c.billCount, 0);
    const withTarget = data.filter((c) => c.salesTarget > 0);
    const totalTarget = withTarget.reduce((s, c) => s + c.salesTarget, 0);

    const chartData = data.filter((c) => c.totalSales > 0).map((c) => ({
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
                "สถานที่": c.location || "-",
                "ยอดขาย (บาท)": c.totalSales,
                "จำนวนบิล": c.billCount,
                "เป้าหมาย (บาท)": c.salesTarget || 0,
                "% ถึงเป้า": c.salesTarget > 0 ? Math.round((c.totalSales / c.salesTarget) * 100) : null
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ยอดขายสาขา");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `channel_revenue_${dateStr}.xlsx`);
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
                    <p className="text-xl font-bold mt-1">฿{fmt(totalSales)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                    <p className="text-xs text-white/70 flex items-center gap-1"><Receipt className="h-3 w-3" /> จำนวนบิล</p>
                    <p className="text-xl font-bold mt-1">{fmt(totalBills)}</p>
                </div>
                {totalTarget > 0 && (
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg hidden sm:block">
                        <p className="text-xs text-white/70 flex items-center gap-1"><Target className="h-3 w-3" /> ถึงเป้ารวม</p>
                        <p className="text-xl font-bold mt-1">{Math.round((totalSales / totalTarget) * 100)}%</p>
                    </div>
                )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">💰 ยอดขายแต่ละสาขา</h3>
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
                                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
                                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={50}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="totalSales" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">รายละเอียดยอดขายแต่ละสาขา</h3>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Download className="h-3.5 w-3.5" />
                        ส่งออก Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-500">
                                <th className="text-left py-2.5 px-4 font-medium">#</th>
                                <th className="text-left py-2.5 px-4 font-medium">สาขา / Event</th>
                                <th className="text-right py-2.5 px-4 font-medium">ยอดขาย</th>
                                <th className="text-right py-2.5 px-4 font-medium">บิล</th>
                                <th className="text-right py-2.5 px-4 font-medium hidden sm:table-cell">เป้าหมาย</th>
                                <th className="text-right py-2.5 px-4 font-medium hidden sm:table-cell">%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((c, i) => {
                                const pct = c.salesTarget > 0 ? Math.round((c.totalSales / c.salesTarget) * 100) : null;
                                return (
                                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                        <td className="py-2.5 px-4 text-slate-400">{i + 1}</td>
                                        <td className="py-2.5 px-4">
                                            <p className="font-medium text-slate-900 truncate max-w-[180px]">{c.name}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {c.code} · {c.type === 'EVENT' ? '🎪' : '🏪'} {c.location}
                                            </p>
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600">฿{fmt(c.totalSales)}</td>
                                        <td className="py-2.5 px-4 text-right text-slate-600">{c.billCount}</td>
                                        <td className="py-2.5 px-4 text-right text-slate-500 hidden sm:table-cell">
                                            {c.salesTarget > 0 ? `฿${fmt(c.salesTarget)}` : '—'}
                                        </td>
                                        <td className="py-2.5 px-4 text-right hidden sm:table-cell">
                                            {pct !== null ? (
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 100
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : pct >= 70
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {pct}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 font-bold text-sm">
                                <td colSpan={2} className="py-3 px-4 text-slate-700">รวมทั้งหมด</td>
                                <td className="py-3 px-4 text-right text-emerald-700">฿{fmt(totalSales)}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{totalBills}</td>
                                <td className="py-3 px-4 text-right text-slate-500 hidden sm:table-cell">
                                    {totalTarget > 0 ? `฿${fmt(totalTarget)}` : '—'}
                                </td>
                                <td className="py-3 px-4 text-right hidden sm:table-cell">
                                    {totalTarget > 0 ? `${Math.round((totalSales / totalTarget) * 100)}%` : '—'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
