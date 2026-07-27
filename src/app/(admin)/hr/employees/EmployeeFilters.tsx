"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Spinner } from "@/components/shared";

export function EmployeeFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "active");

    const updateParams = (newQuery: string, newStatus: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (newQuery) {
                params.set("q", newQuery);
            } else {
                params.delete("q");
            }
            if (newStatus && newStatus !== "active") {
                params.set("status", newStatus);
            } else {
                params.delete("status");
            }
            params.delete("page"); // reset to page 1 on new search
            router.push(`/hr/employees?${params.toString()}`);
        });
    };

    const handleSearch = (value: string) => {
        setQuery(value);
        updateParams(value, statusFilter);
    };

    const handleStatusChange = (value: string) => {
        setStatusFilter(value);
        updateParams(query, value);
    };

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[250px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="ค้นหาด้วยรหัส หรือ ชื่อ..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                />
            </div>
            <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors min-w-[150px]"
            >
                <option value="active">แสดงเฉพาะ ใช้งาน</option>
                <option value="inactive">แสดงเฉพาะ ลาออก/ปิดใช้งาน</option>
                <option value="all">แสดงทั้งหมด</option>
            </select>
            {isPending && (
                <Spinner size="sm" />
            )}
        </div>
    );
}
