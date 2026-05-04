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
import { Trophy, TrendingUp, Hash, Download } from "lucide-react";

interface Product {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
    color: string | null;
    qtySold: number;
    revenue: number;
    billCount: number;
}

interface Props {
    data: Product[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200 max-w-[200px]">
            <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
            <p className="text-[10px] text-slate-400">{d.code} {d.size && `• ${d.size}`} {d.color && `• ${d.color}`}</p>
            <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-emerald-600 font-semibold">฿{fmt(d.revenue)}</p>
                <p className="text-[10px] text-slate-500">{fmt(d.qtySold)} ชิ้น · {d.billCount} บิล</p>
            </div>
        </div>
    );
}

export function TopProductsReport({ data }: Props) {
    const totalRevenue = data.reduce((s, p) => s + p.revenue, 0);
    const totalQty = data.reduce((s, p) => s + p.qtySold, 0);
    const chartData = data.slice(0, 15).map((p) => ({
        ...p,
        label: p.code || p.barcode.slice(0, 8),
    }));

    const handleExport = async () => {
        try {
            const XLSX = await import("xlsx");
            const rows = data.map((p, i) => ({
                "ลำดับ": i + 1,
                "บาร์โค้ด": p.barcode,
                "ชื่อสินค้า": p.name,
                "รหัส": p.code || "-",
                "ไซส์": p.size || "-",
                "สี": p.color || "-",
                "จำนวนชิ้น": p.qtySold,
                "ยอดเงิน (บาท)": p.revenue,
                "จำนวนบิล": p.billCount
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สินค้าขายดี");
            const dateStr = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `top_products_${dateStr}.xlsx`);
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
                    <h3 className="text-sm font-bold text-slate-900 mb-4">🏆 Top 15 สินค้าขายดี (ยอดเงิน)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
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
                                <Bar dataKey="revenue" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700">รายละเอียดสินค้าขายดี</h3>
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
                                <th className="text-left py-2.5 px-4 font-medium">สินค้า</th>
                                <th className="text-right py-2.5 px-4 font-medium">ขายได้</th>
                                <th className="text-right py-2.5 px-4 font-medium">ยอดเงิน</th>
                                <th className="text-right py-2.5 px-4 font-medium hidden sm:table-cell">บิล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((p, i) => (
                                <tr key={p.barcode} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="py-2.5 px-4 text-slate-400">{i + 1}</td>
                                    <td className="py-2.5 px-4">
                                        <p className="font-medium text-slate-900 truncate max-w-[200px]">{p.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {p.code || p.barcode}{p.size && ` • ${p.size}`}{p.color && ` • ${p.color}`}
                                        </p>
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-semibold text-blue-600">{fmt(p.qtySold)}</td>
                                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600">฿{fmt(p.revenue)}</td>
                                    <td className="py-2.5 px-4 text-right text-slate-500 hidden sm:table-cell">{p.billCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
