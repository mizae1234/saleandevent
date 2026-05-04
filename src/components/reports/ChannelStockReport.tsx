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
    Legend,
} from "recharts";
import { Package, Truck, ShoppingCart, ChevronDown, ChevronRight, EyeOff } from "lucide-react";
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

    const totalSent = data.reduce((s, c) => s + c.totalSent, 0);
    const totalSold = data.reduce((s, c) => s + c.totalSold, 0);
    const totalRemaining = data.reduce((s, c) => s + c.totalRemaining, 0);

    const chartData = data
        .filter((c) => c.totalSent > 0)
        .map((c) => ({
            ...c,
            label: c.code,
        }));

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
                    <h3 className="text-sm font-bold text-slate-700">รายละเอียดสต็อกแต่ละสาขา</h3>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">REAL-TIME</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {data.filter((c) => c.totalSent > 0).map((channel) => {
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
                                    <div className="bg-slate-50/50 border-t border-slate-100 px-4 py-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-slate-400">
                                                    <th className="text-left py-1.5 font-medium">สินค้า</th>
                                                    <th className="text-right py-1.5 font-medium">ส่งไป</th>
                                                    <th className="text-right py-1.5 font-medium">ขาย</th>
                                                    <th className="text-right py-1.5 font-medium">เหลือ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {channel.items.map((item) => (
                                                    <tr key={item.barcode} className="border-t border-slate-100/50">
                                                        <td className="py-1.5">
                                                            <span className="text-slate-700">{item.name}</span>
                                                            <span className="text-[9px] text-slate-400 ml-1">
                                                                {item.size && item.size}{item.color && ` · ${item.color}`}
                                                            </span>
                                                        </td>
                                                        <td className="py-1.5 text-right text-slate-500">{item.sent}</td>
                                                        <td className="py-1.5 text-right text-emerald-600 font-medium">{item.sold}</td>
                                                        <td className="py-1.5 text-right font-bold text-amber-600">{item.remaining}</td>
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
        </div>
    );
}
