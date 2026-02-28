"use client";

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

interface ExpenseItem {
    category: string;
    amount: number;
    percent: number;
}

interface Props {
    data: ExpenseItem[];
    totalSales: number;
}

const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1",
];

function fmt(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const item = payload[0];
    return (
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.payload.fill }} />
                <span className="text-sm font-medium text-slate-900">{item.name}</span>
            </div>
            <p className="text-sm text-slate-700">฿{fmt(item.value)}</p>
            <p className="text-xs text-slate-500">{item.payload.percent.toFixed(1)}% ของยอดขาย</p>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLabel({ category, percent }: any) {
    if (percent < 5) return null;
    return `${category} (${percent.toFixed(0)}%)`;
}

export function ExpenseChart({ data, totalSales }: Props) {
    const totalExpenses = data.reduce((sum, e) => sum + e.amount, 0);
    const expenseRatio = totalSales > 0 ? (totalExpenses / totalSales * 100).toFixed(1) : "0";

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">💸 ค่าใช้จ่ายตามประเภท</h3>
                <div className="h-48 flex items-center justify-center text-slate-400">
                    ไม่มีข้อมูลค่าใช้จ่าย
                </div>
            </div>
        );
    }

    const chartData = data.map((e, i) => ({
        name: e.category,
        value: e.amount,
        percent: e.percent,
        fill: COLORS[i % COLORS.length],
    }));

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">💸 ค่าใช้จ่ายตามประเภท</h3>
                <div className="text-sm text-slate-500">
                    รวม <span className="font-semibold text-slate-900">฿{fmt(totalExpenses)}</span>{" "}
                    <span className="text-xs">({expenseRatio}% ของยอดขาย)</span>
                </div>
            </div>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            label={renderLabel}
                            labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: 12 }}
                            iconType="square"
                            iconSize={10}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
