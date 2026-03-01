"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Spinner } from "@/components/shared";

export function ProductFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const currentCategory = searchParams.get("category") || "";

    const handleSearch = (value: string) => {
        setQuery(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set("q", value);
            } else {
                params.delete("q");
            }
            params.delete("page");
            router.push(`/admin/products?${params.toString()}`);
        });
    };

    const handleCategoryChange = (value: string) => {
        startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set("category", value);
            } else {
                params.delete("category");
            }
            params.delete("page");
            router.push(`/admin/products?${params.toString()}`);
        });
    };

    const CATEGORIES = [
        { value: "", label: "ทั้งหมด" },
        { value: "กางเกงยีนส์", label: "กางเกงยีนส์" },
        { value: "กางเกงขาสั้น", label: "กางเกงขาสั้น" },
        { value: "เสื้อ", label: "เสื้อ" },
        { value: "กระเป๋า", label: "กระเป๋า" },
        { value: "เข็มขัด", label: "เข็มขัด" },
        { value: "อื่นๆ", label: "อื่นๆ" },
    ];

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="ค้นหาด้วยบาร์โค้ด, รหัส, ชื่อ..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                />
            </div>
            <select
                value={currentCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="py-2.5 px-4 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-600 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors cursor-pointer"
            >
                {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                        {c.label}
                    </option>
                ))}
            </select>
            {isPending && (
                <Spinner size="sm" />
            )}
        </div>
    );
}
