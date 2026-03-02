"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Calendar, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

export function ExpensesFilters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) params.set("q", term);
        else params.delete("q");
        params.delete("page");
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleDateChange = (key: "startDate" | "endDate", value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete("page");
        replace(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setStartDate("");
        setEndDate("");
        replace(pathname);
    };

    const hasFilters = searchTerm || startDate || endDate;

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหา Event / สถานที่..."
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />
                </div>

                {/* Start Date */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            handleDateChange("startDate", e.target.value);
                        }}
                    />
                </div>

                {/* End Date */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="date"
                        className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-colors"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            handleDateChange("endDate", e.target.value);
                        }}
                    />
                </div>
            </div>

            {hasFilters && (
                <div className="flex justify-end">
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
