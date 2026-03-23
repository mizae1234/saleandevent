"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, RefreshCw, LayoutDashboard } from "lucide-react";
import { SpinnerFullPage, EmptyState } from "@/components/shared";
import { KpiCards } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { EventTable } from "@/components/dashboard/EventTable";
import { BranchChart } from "@/components/dashboard/BranchChart";
import { BranchTable } from "@/components/dashboard/BranchTable";
import { ProductInsight } from "@/components/dashboard/ProductInsight";
import { ExpenseChart } from "@/components/dashboard/ExpenseChart";

interface DashboardData {
    kpi: {
        totalSales: number;
        salesMoM: number;
        netProfit: number;
        totalQuantity: number;
        avgBillSize: number;
        totalBills: number;
        totalExpenses: number;
    };
    dailySales: { date: string; total: number; count: number }[];
    events: any[];
    branches: any[];
    topProducts: any[];
    deadStock: any[];
    expenseBreakdown: any[];
    dateRange: { from: string; to: string };
}

type QuickRange = "thisMonth" | "lastMonth" | "last7" | "last30" | "custom";

function getMonthName(date: Date) {
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function getDefaultRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
    };
}

export function DashboardClient() {
    const def = getDefaultRange();
    const [from, setFrom] = useState(def.from);
    const [to, setTo] = useState(def.to);
    const [quickRange, setQuickRange] = useState<QuickRange>("thisMonth");
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (f: string, t: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/dashboard/owner?from=${f}&to=${t}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(from, to);
    }, [from, to, fetchData]);

    const handleQuick = (range: QuickRange) => {
        const now = new Date();
        let f: Date, t: Date;
        switch (range) {
            case "thisMonth":
                f = new Date(now.getFullYear(), now.getMonth(), 1);
                t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case "lastMonth":
                f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                t = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "last7":
                f = new Date(now);
                f.setDate(f.getDate() - 6);
                t = now;
                break;
            case "last30":
                f = new Date(now);
                f.setDate(f.getDate() - 29);
                t = now;
                break;
            default:
                return;
        }
        setQuickRange(range);
        setFrom(f.toISOString().split("T")[0]);
        setTo(t.toISOString().split("T")[0]);
    };

    const quickButtons: { key: QuickRange; label: string }[] = [
        { key: "thisMonth", label: "เดือนนี้" },
        { key: "lastMonth", label: "เดือนก่อน" },
        { key: "last7", label: "7 วัน" },
        { key: "last30", label: "30 วัน" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <LayoutDashboard className="h-7 w-7 text-teal-600" />
                        Owner Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        ภาพรวมธุรกิจ — {getMonthName(new Date(from))}
                    </p>
                </div>
                <button
                    onClick={() => fetchData(from, to)}
                    disabled={loading}
                    className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </button>
            </div>

            {/* Date Range Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick range buttons */}
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                        {quickButtons.map((btn) => (
                            <button
                                key={btn.key}
                                onClick={() => handleQuick(btn.key)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${quickRange === btn.key
                                    ? "bg-teal-600 text-white"
                                    : "bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block" />

                    {/* Custom date range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => {
                                setFrom(e.target.value);
                                setQuickRange("custom");
                            }}
                            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                        />
                        <span className="text-slate-400 text-sm">ถึง</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => {
                                setTo(e.target.value);
                                setQuickRange("custom");
                            }}
                            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                        />
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <SpinnerFullPage label="กำลังโหลดข้อมูล..." />
            )}

            {/* Dashboard Content */}
            {!loading && data && (
                <div className="space-y-6">
                    {/* 1. KPI Cards */}
                    <KpiCards data={data.kpi} />

                    {/* 2. Sales Trend + Expense Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <SalesChart data={data.dailySales} />
                        </div>
                        <div>
                            <ExpenseChart
                                data={data.expenseBreakdown}
                                totalSales={data.kpi.totalSales}
                            />
                        </div>
                    </div>

                    {/* 3. Performance Tables */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {data.events.length > 0 && <EventTable data={data.events} />}
                        {data.branches.length > 0 && <BranchTable data={data.branches} />}
                    </div>

                    {/* 4. Branch Comparison */}
                    {data.branches.length > 0 && <BranchChart data={data.branches} />}

                    {/* 5. Product Insights */}
                    <ProductInsight
                        topProducts={data.topProducts}
                        deadStock={data.deadStock}
                    />
                </div>
            )}

            {/* Empty State */}
            {!loading && !data && (
                <EmptyState
                    icon={LayoutDashboard}
                    message="ไม่สามารถโหลดข้อมูลได้"
                    description="กรุณาลองใหม่อีกครั้ง"
                />
            )}
        </div>
    );
}
