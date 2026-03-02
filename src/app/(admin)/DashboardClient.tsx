"use client";

import { useState, useEffect, useCallback } from "react";
import {
    LayoutDashboard,
    Package,
    AlertTriangle,
    TrendingUp,
    ClipboardList,
    RefreshCw,
    ArrowRight,
    ScanBarcode,
    PlusCircle,
    Tag,
    Receipt,
    MapPin,
    Store,
    Calendar,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
    stats: {
        totalProducts: number;
        lowStockProducts: number;
        todayTotalSales: number;
        todayBillCount: number;
        pendingRequests: number;
    };
    recentSales: {
        id: string;
        billCode: string | null;
        totalAmount: number;
        discount: number;
        soldAt: string;
        channelName: string;
        channelType: string;
    }[];
    activeChannels: {
        id: string;
        name: string;
        type: string;
        location: string;
        status: string;
    }[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
    });
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function DashboardClient() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/dashboard");
            if (!res.ok) throw new Error("Failed");
            setData(await res.json());
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const statCards = data
        ? [
            {
                label: "จำนวนสินค้า",
                value: fmt(data.stats.totalProducts),
                sub: "รายการ",
                icon: Package,
                gradient: "from-teal-500 to-teal-600",
                iconBg: "bg-teal-400/20",
            },
            {
                label: "สินค้าใกล้หมด",
                value: fmt(data.stats.lowStockProducts),
                sub: "รายการ",
                icon: AlertTriangle,
                gradient: "from-amber-500 to-orange-500",
                iconBg: "bg-amber-400/20",
            },
            {
                label: "ยอดขายวันนี้",
                value: `฿${fmt(data.stats.todayTotalSales)}`,
                sub: `${fmt(data.stats.todayBillCount)} บิล`,
                icon: TrendingUp,
                gradient: "from-emerald-500 to-emerald-600",
                iconBg: "bg-emerald-400/20",
            },
            {
                label: "รายการรออนุมัติ",
                value: fmt(data.stats.pendingRequests),
                sub: "รายการ",
                icon: ClipboardList,
                gradient: "from-blue-500 to-blue-600",
                iconBg: "bg-blue-400/20",
            },
        ]
        : [];

    const quickActions = [
        { label: "ขายสินค้า (POS)", href: "/pc/pos", icon: ScanBarcode, color: "bg-teal-600 hover:bg-teal-700" },
        { label: "เปิดช่องทางใหม่", href: "/channels/create", icon: PlusCircle, color: "bg-emerald-600 hover:bg-emerald-700" },
        { label: "จัดการสินค้า", href: "/admin/products", icon: Tag, color: "bg-slate-600 hover:bg-slate-700" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                            <LayoutDashboard className="h-6 w-6 text-white" />
                        </div>
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 ml-[52px]">ภาพรวมระบบ Saran Jeans</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </button>
            </div>

            {/* Loading Skeleton */}
            {loading && !data && (
                <div className="space-y-6 animate-pulse">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-slate-200" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 h-80 rounded-2xl bg-slate-200" />
                        <div className="h-80 rounded-2xl bg-slate-200" />
                    </div>
                </div>
            )}

            {/* Content */}
            {data && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {statCards.map(card => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.label}
                                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5">
                                            <p className="text-sm font-medium text-white/80">{card.label}</p>
                                            <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                                            <p className="text-xs text-white/60">{card.sub}</p>
                                        </div>
                                        <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    {/* Decorative elements */}
                                    <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/5" />
                                    <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-white/5" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Recent Sales + Active Channels */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Recent Sales */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-teal-50">
                                            <Receipt className="h-4 w-4 text-teal-600" />
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900">รายการขายล่าสุด</h3>
                                    </div>
                                    <Link
                                        href="/pc/sales"
                                        className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                    >
                                        ดูทั้งหมด
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                {data.recentSales.length === 0 ? (
                                    <div className="px-6 pb-6 pt-4 text-center">
                                        <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">ยังไม่มีรายการขาย</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {data.recentSales.map(sale => (
                                            <div
                                                key={sale.id}
                                                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        {sale.billCode || sale.id.slice(0, 8)}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-slate-400">
                                                            {sale.channelName}
                                                        </span>
                                                        <span className="text-slate-200">·</span>
                                                        <span className="text-xs text-slate-400">
                                                            {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    <span className="text-sm font-bold text-slate-800">
                                                        ฿{fmt(sale.totalAmount)}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        สำเร็จ
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Active Channels */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-blue-50">
                                            <Store className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-900">ช่องทางขายที่กำลังเปิด</h3>
                                    </div>
                                    <Link
                                        href="/channels"
                                        className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                                    >
                                        ดูทั้งหมด
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>

                                {data.activeChannels.length === 0 ? (
                                    <div className="px-6 pb-6 pt-4 text-center">
                                        <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">ไม่มีช่องทางที่กำลังเปิดอยู่</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {data.activeChannels.map(ch => (
                                            <Link
                                                key={ch.id}
                                                href={`/channels/${ch.id}`}
                                                className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`flex-shrink-0 p-2 rounded-lg ${ch.type === 'EVENT' ? 'bg-violet-50' : 'bg-teal-50'}`}>
                                                        {ch.type === 'EVENT' ? (
                                                            <Calendar className={`h-4 w-4 text-violet-600`} />
                                                        ) : (
                                                            <Store className={`h-4 w-4 text-teal-600`} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{ch.name}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <MapPin className="h-3 w-3 text-slate-400" />
                                                            <span className="text-xs text-slate-400 truncate">{ch.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ch.type === 'EVENT'
                                                    ? 'bg-violet-50 text-violet-700 border border-violet-100'
                                                    : 'bg-teal-50 text-teal-700 border border-teal-100'
                                                    }`}>
                                                    {ch.type === 'EVENT' ? 'อีเว้นท์' : 'สาขา'}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column — Quick Actions */}
                        <div className="space-y-6">
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 shadow-xl">
                                {/* Background decorations */}
                                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

                                <div className="relative">
                                    <h3 className="text-lg font-bold text-white">สร้างรายการใหม่</h3>
                                    <p className="text-sm text-teal-100/80 mt-1">บันทึกการขาย หรือจัดการข้อมูล</p>

                                    <div className="mt-5 space-y-3">
                                        {quickActions.map(action => {
                                            const Icon = action.icon;
                                            return (
                                                <Link
                                                    key={action.href}
                                                    href={action.href}
                                                    className={`flex items-center gap-3 w-full px-4 py-3 ${action.color} rounded-xl text-white font-medium text-sm transition-all shadow-lg shadow-black/10 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-0`}
                                                >
                                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                                    {action.label}
                                                    <ArrowRight className="h-4 w-4 ml-auto opacity-60" />
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Today Summary Mini Card */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <h4 className="text-sm font-semibold text-slate-700 mb-4">สรุปวันนี้</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">ยอดขาย</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            ฿{fmt(data.stats.todayTotalSales)}
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-100" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">จำนวนบิล</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {fmt(data.stats.todayBillCount)} บิล
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-100" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">รอดำเนินการ</span>
                                        <span className={`text-sm font-bold ${data.stats.pendingRequests > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                                            {fmt(data.stats.pendingRequests)} รายการ
                                        </span>
                                    </div>
                                    <div className="h-px bg-slate-100" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">สินค้าใกล้หมด</span>
                                        <span className={`text-sm font-bold ${data.stats.lowStockProducts > 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                            {fmt(data.stats.lowStockProducts)} รายการ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
