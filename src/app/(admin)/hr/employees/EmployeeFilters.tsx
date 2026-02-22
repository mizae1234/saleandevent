"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

export function EmployeeFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(searchParams.get("q") || "");

    const handleSearch = (value: string) => {
        setQuery(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set("q", value);
            } else {
                params.delete("q");
            }
            params.delete("page"); // reset to page 1 on new search
            router.push(`/hr/employees?${params.toString()}`);
        });
    };

    return (
        <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="ค้นหาด้วยรหัส หรือ ชื่อ..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                />
            </div>
            {isPending && (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            )}
        </div>
    );
}
