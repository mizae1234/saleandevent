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
import { Package, Hash } from "lucide-react";

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

export function ChannelQuantityReport({ data }: Props) {
    const totalQty = data.reduce((s, c) => s + c.totalQty, 0);
    const totalBills = data.reduce((s, c) => s + c.billCount, 0);

    const chartData = data.filter((c) => c.totalQty > 0).map((c) => ({
        ...c,
        label: c.code,
    }));

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
                <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700">รายละเอียดจำนวนขายแต่ละสาขา</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-500">
                                <th className="text-left py-2.5 px-4 font-medium">#</th>
                                <th className="text-left py-2.5 px-4 font-medium">สาขา / Event</th>
                                <th className="text-right py-2.5 px-4 font-medium">จำนวนชิ้น</th>
                                <th className="text-right py-2.5 px-4 font-medium">จำนวนบิล</th>
                                <th className="text-right py-2.5 px-4 font-medium hidden sm:table-cell">เฉลี่ย/บิล</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((c, i) => (
                                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                    <td className="py-2.5 px-4 text-slate-400">{i + 1}</td>
                                    <td className="py-2.5 px-4">
                                        <p className="font-medium text-slate-900 truncate max-w-[180px]">{c.name}</p>
                                        <p className="text-[10px] text-slate-400">{c.code} · {c.type === 'EVENT' ? '🎪' : '🏪'}</p>
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-bold text-blue-600">{fmt(c.totalQty)}</td>
                                    <td className="py-2.5 px-4 text-right text-slate-600">{c.billCount}</td>
                                    <td className="py-2.5 px-4 text-right text-slate-500 hidden sm:table-cell">
                                        {c.billCount > 0 ? (c.totalQty / c.billCount).toFixed(1) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 font-bold text-sm">
                                <td colSpan={2} className="py-3 px-4 text-slate-700">รวมทั้งหมด</td>
                                <td className="py-3 px-4 text-right text-blue-700">{fmt(totalQty)}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{totalBills}</td>
                                <td className="py-3 px-4 text-right text-slate-500 hidden sm:table-cell">
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
