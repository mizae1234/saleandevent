"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, RefreshCw, FileBarChart, Trophy, Store, Package, Boxes, Search, ChevronDown, Filter } from "lucide-react";
import { SpinnerFullPage, EmptyState } from "@/components/shared";
import { TopProductsReport } from "@/components/reports/TopProductsReport";
import { ChannelRevenueReport } from "@/components/reports/ChannelRevenueReport";
import { ChannelQuantityReport } from "@/components/reports/ChannelQuantityReport";
import { ChannelStockReport } from "@/components/reports/ChannelStockReport";
import { TotalStockReport } from "@/components/reports/TotalStockReport";

type TabKey = "products" | "revenue" | "quantity" | "stock" | "totalStock";
type QuickRange = "thisMonth" | "lastMonth" | "last7" | "last30" | "custom";
type ChannelType = "all" | "EVENT" | "BRANCH";

const TABS: { key: TabKey; label: string; icon: typeof Trophy }[] = [
    { key: "products", label: "สินค้าที่ขายทั้งหมด", icon: Trophy },
    { key: "revenue", label: "ยอดขายสาขา", icon: Store },
    { key: "quantity", label: "จำนวนขาย", icon: Package },
    { key: "stock", label: "สินค้าคงเหลือ", icon: Boxes },
    { key: "totalStock", label: "คงเหลือรวม", icon: Package },
];

function getDefaultRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
    };
}

function getMonthName(date: Date) {
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function ChannelSelect({ value, onChange, options = [] }: { value: string, onChange: (v: string) => void, options: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOpt = value === "all" ? null : options.find(o => o.id === value);
    const filtered = options.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase()) || 
        o.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
                className="flex items-center justify-between w-[220px] h-9 px-3 text-sm text-left bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
            >
                <span className="truncate">{selectedOpt ? `${selectedOpt.name} (${selectedOpt.code})` : "ทุกสาขา / Event (ทั้งหมด)"}</span>
                <ChevronDown className="h-4 w-4 text-slate-400 ml-2 flex-shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute z-50 w-[280px] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input 
                            type="text"
                            className="w-full text-sm outline-none bg-transparent"
                            placeholder="ค้นหาสาขารหัสหรือชื่อ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <ul className="max-h-60 overflow-y-auto p-1">
                        <li 
                            className={`px-3 py-2 text-sm rounded-lg cursor-pointer ${value === "all" ? "bg-teal-50 text-teal-700 font-medium" : "hover:bg-slate-50"}`}
                            onClick={() => { onChange("all"); setIsOpen(false); }}
                        >
                            ทุกสาขา / Event (ทั้งหมด)
                        </li>
                        {filtered.map(c => (
                            <li 
                                key={c.id}
                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer ${value === c.id ? "bg-teal-50 text-teal-700 font-medium" : "hover:bg-slate-50"}`}
                                onClick={() => { onChange(c.id); setIsOpen(false); }}
                            >
                                <div className="font-medium text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-400">{c.code} · {c.type === "EVENT" ? "Event" : "Branch"}</div>
                            </li>
                        ))}
                        {filtered.length === 0 && (
                            <li className="px-3 py-4 text-sm text-center text-slate-400">ไม่พบสาขาที่ค้นหา</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function ReportsClient() {
    const def = getDefaultRange();
    const [from, setFrom] = useState(def.from);
    const [to, setTo] = useState(def.to);
    const [quickRange, setQuickRange] = useState<QuickRange>("thisMonth");
    const [channelId, setChannelId] = useState("all");
    const [channelType, setChannelType] = useState<ChannelType>("all");
    const [activeTab, setActiveTab] = useState<TabKey>("products");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async (f: string, t: string, cId: string, cType: string, tab: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports?from=${f}&to=${t}&channelId=${cId}&channelType=${cType}&tab=${tab}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error("Reports fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(from, to, channelId, channelType, activeTab);
    }, [from, to, channelId, channelType, activeTab, fetchData]);

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
                f = new Date(now); f.setDate(f.getDate() - 6);
                t = now;
                break;
            case "last30":
                f = new Date(now); f.setDate(f.getDate() - 29);
                t = now;
                break;
            default: return;
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
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <FileBarChart className="h-7 w-7 text-teal-600" />
                        รายงาน
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        สรุปข้อมูลการขาย — {getMonthName(new Date(from))}
                    </p>
                </div>
                <button
                    onClick={() => fetchData(from, to, channelId, channelType, activeTab)}
                    disabled={loading}
                    className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    รีเฟรช
                </button>
            </div>

            {/* Date Range + Tabs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Channel Filter */}
                    <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-slate-400" />
                        <ChannelSelect 
                            value={channelId} 
                            onChange={setChannelId} 
                            options={data?.availableChannels || []} 
                        />
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block" />

                    {/* Channel Type Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                            {([
                                { key: "all" as ChannelType, label: "ทั้งหมด" },
                                { key: "EVENT" as ChannelType, label: "Event" },
                                { key: "BRANCH" as ChannelType, label: "สาขา" },
                            ]).map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setChannelType(opt.key); setChannelId("all"); }}
                                    className={`px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                                        channelType === opt.key
                                            ? "bg-teal-600 text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block" />

                    {/* Date Range */}
                    {activeTab !== "stock" && activeTab !== "totalStock" && (
                        <>
                            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                                {quickButtons.map((btn) => (
                                    <button
                                        key={btn.key}
                                        onClick={() => handleQuick(btn.key)}
                                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${quickRange === btn.key
                                            ? "bg-teal-600 text-white"
                                            : "bg-white text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden md:block" />
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => { setFrom(e.target.value); setQuickRange("custom"); }}
                                    className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                                />
                                <span className="text-slate-400 text-sm">ถึง</span>
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => { setTo(e.target.value); setQuickRange("custom"); }}
                                    className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                                />
                            </div>
                        </>
                    )}
                </div>

                {activeTab === "stock" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                        <Boxes className="h-4 w-4" />
                        ข้อมูลสต็อกเป็นแบบ Real-time — ไม่ใช้ตัวกรองวันที่
                    </div>
                )}

                {activeTab === "totalStock" && (
                    <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                        <Package className="h-4 w-4" />
                        ข้อมูลสต็อกคงเหลือรวมเป็นแบบ Real-time — ไม่ใช้ตัวกรองวันที่
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                    ? "bg-teal-600 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading */}
            {loading && <SpinnerFullPage label="กำลังโหลดข้อมูล..." />}

            {/* Content */}
            {!loading && data && (
                <>
                    {activeTab === "products" && <TopProductsReport data={data.topProducts} />}
                    {activeTab === "revenue" && <ChannelRevenueReport data={data.channelRevenue} />}
                    {activeTab === "quantity" && <ChannelQuantityReport data={data.channelQuantity} />}
                    {activeTab === "stock" && <ChannelStockReport data={data.channelStock} />}
                    {activeTab === "totalStock" && <TotalStockReport data={data.totalStockSummary} />}
                </>
            )}

            {/* Empty State */}
            {!loading && !data && (
                <EmptyState
                    icon={FileBarChart}
                    message="ไม่สามารถโหลดข้อมูลได้"
                    description="กรุณาลองใหม่อีกครั้ง"
                />
            )}
        </div>
    );
}
