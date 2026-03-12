"use client";

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt, Calculator, Coins } from "lucide-react";

interface KpiData {
    totalSales: number;
    salesMoM: number;
    netProfit: number;
    totalQuantity: number;
    avgBillSize: number;
    totalBills: number;
    totalExpenses: number;
}

interface Props {
    data: KpiData;
}

import { fmt } from "@/lib/utils";

function fmtDec(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const cards = [
    {
        key: "totalSales",
        label: "ยอดขายรวม",
        icon: DollarSign,
        color: "from-blue-500 to-blue-600",
        iconBg: "bg-blue-400/20",
        format: (d: KpiData) => `฿${fmt(d.totalSales)}`,
        sub: (d: KpiData) => {
            const sign = d.salesMoM >= 0 ? "+" : "";
            return `${sign}${d.salesMoM.toFixed(1)}% จากช่วงก่อน`;
        },
        trend: (d: KpiData) => d.salesMoM,
    },
    {
        key: "netProfit",
        label: "กำไรสุทธิ",
        icon: Coins,
        color: "from-emerald-500 to-emerald-600",
        iconBg: "bg-emerald-400/20",
        format: (d: KpiData) => `฿${fmt(d.netProfit)}`,
        sub: (d: KpiData) => `หักค่าใช้จ่าย ฿${fmt(d.totalExpenses)}`,
        trend: (d: KpiData) => d.netProfit,
    },
    {
        key: "totalQuantity",
        label: "จำนวนชิ้นขาย",
        icon: ShoppingCart,
        color: "from-violet-500 to-violet-600",
        iconBg: "bg-violet-400/20",
        format: (d: KpiData) => `${fmt(d.totalQuantity)} ชิ้น`,
        sub: (d: KpiData) => `จาก ${fmt(d.totalBills)} บิล`,
        trend: () => 1,
    },
    {
        key: "avgBillSize",
        label: "เฉลี่ยต่อบิล",
        icon: Calculator,
        color: "from-amber-500 to-amber-600",
        iconBg: "bg-amber-400/20",
        format: (d: KpiData) => `฿${fmtDec(d.avgBillSize)}`,
        sub: (d: KpiData) => `รวม ${fmt(d.totalBills)} บิล`,
        trend: () => 1,
    },
    {
        key: "totalExpenses",
        label: "ค่าใช้จ่ายรวม",
        icon: Receipt,
        color: "from-rose-500 to-rose-600",
        iconBg: "bg-rose-400/20",
        format: (d: KpiData) => `฿${fmt(d.totalExpenses)}`,
        sub: (d: KpiData) => {
            const pct = d.totalSales > 0 ? (d.totalExpenses / d.totalSales * 100).toFixed(1) : "0";
            return `${pct}% ของยอดขาย`;
        },
        trend: (d: KpiData) => -d.totalExpenses,
    },
];

export function KpiCards({ data }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card) => {
                const Icon = card.icon;
                const trendVal = card.trend(data);
                const isPositive = trendVal >= 0;
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;

                return (
                    <div
                        key={card.key}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-white/80">{card.label}</p>
                                <p className="text-2xl font-bold tracking-tight">{card.format(data)}</p>
                                <div className="flex items-center gap-1 text-xs text-white/70">
                                    <TrendIcon className="h-3 w-3" />
                                    <span>{card.sub(data)}</span>
                                </div>
                            </div>
                            <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                                <Icon className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
                    </div>
                );
            })}
        </div>
    );
}
