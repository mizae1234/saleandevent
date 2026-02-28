"use client";

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

interface BranchData {
    id: string;
    name: string;
    code: string;
    sales: number;
    profit: number;
    expenses: number;
}

interface Props {
    data: BranchData[];
}

function formatMoney(value: number) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toFixed(0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200">
            <p className="text-xs font-medium text-slate-700 mb-2">{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-medium text-slate-900">
                        ฿{Number(p.value).toLocaleString("th-TH")}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function BranchChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">🏬 เปรียบเทียบสาขา</h3>
                <div className="h-48 flex items-center justify-center text-slate-400">
                    ไม่มีข้อมูลสาขาในช่วงนี้
                </div>
            </div>
        );
    }

    const chartData = data.map((b) => ({
        name: b.name.length > 12 ? b.name.slice(0, 12) + "…" : b.name,
        ยอดขาย: b.sales,
        กำไร: b.profit,
    }));

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">🏬 เปรียบเทียบสาขา</h3>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={{ stroke: "#e2e8f0" }}
                            tickLine={false}
                        />
                        <YAxis
                            tickFormatter={formatMoney}
                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: 12 }}
                            iconType="square"
                            iconSize={10}
                        />
                        <Bar
                            dataKey="ยอดขาย"
                            fill="#3b82f6"
                            radius={[6, 6, 0, 0]}
                        />
                        <Bar
                            dataKey="กำไร"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
