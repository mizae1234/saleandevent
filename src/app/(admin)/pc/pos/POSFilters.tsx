"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X, CalendarDays } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { CHANNEL_STATUS } from "@/config/status";
import { format } from "date-fns";

function getTodayStr() {
    return format(new Date(), "yyyy-MM-dd");
}

const STATUS_OPTIONS = [
    { value: "all", label: "ทั้งหมด" },
    { value: "active", label: CHANNEL_STATUS.active.label },
    { value: "closed", label: CHANNEL_STATUS.closed.label },
    { value: "draft", label: CHANNEL_STATUS.draft.label },
];

export function POSFilters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const todayStr = getTodayStr();
    const currentStatus = searchParams.get("status") ?? "active"; // Default is active
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    // date: use URL param if present, otherwise default to today
    const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || todayStr);

    // On first mount, if no date param, push today into URL so server can filter
    useEffect(() => {
        if (!searchParams.get("date")) {
            const params = new URLSearchParams(searchParams);
            params.set("date", todayStr);
            replace(`${pathname}?${params.toString()}`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status === "active") {
            params.delete("status"); // Because 'active' is our default, keep URL clean or explicitly set it
        } else {
            params.set("status", status);
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) params.set("q", term);
        else params.delete("q");
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleDateChange = (value: string) => {
        setSelectedDate(value);
        const params = new URLSearchParams(searchParams);
        if (value) params.set("date", value);
        else params.delete("date");
        replace(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedDate(todayStr);
        const params = new URLSearchParams();
        params.set("date", todayStr);
        replace(`${pathname}?${params.toString()}`);
    };

    const hasFilters = searchTerm || (currentStatus !== "active" && currentStatus !== "all") || selectedDate !== todayStr;

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event หรือสาขา (ชื่อ, รหัส)..."
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />
                </div>

                {/* Date Filter */}
                <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors appearance-none"
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {hasFilters && (
                <div className="mt-3 flex justify-end">
                    <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="h-3 w-3" />
                        ล้างตัวกรอง
                    </button>
                </div>
            )}
        </div>
    );
}
