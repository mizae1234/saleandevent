"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Search, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "use-debounce";

export function EventFilters() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("q", term);
        } else {
            params.delete("q");
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleDateChange = useCallback((key: "startDate" | "endDate", value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        replace(`${pathname}?${params.toString()}`);
    }, [searchParams, pathname, replace]);

    const clearFilters = () => {
        setSearchTerm("");
        setStartDate("");
        setEndDate("");
        replace(pathname);
    };

    return (
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100 mb-6">
            <div className="grid gap-4 md:grid-cols-4">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search event name or code..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            handleSearch(e.target.value);
                        }}
                    />
                </div>
                <div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            className="pl-9"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                handleDateChange("startDate", e.target.value);
                            }}
                        />
                    </div>
                </div>
                <div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            className="pl-9"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                handleDateChange("endDate", e.target.value);
                            }}
                        />
                    </div>
                </div>
            </div>
            {(searchTerm || startDate || endDate) && (
                <div className="mt-3 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <X className="mr-2 h-3 w-3" />
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    );
}
