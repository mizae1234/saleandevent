"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
    events: { id: string; name: string; code: string }[];
}

export function ShipmentsFilter({ events }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [channelId, setChannelId] = useState(searchParams.get("channelId") || "");
    const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
    const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");

    const applyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (channelId) params.set("channelId", channelId);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        router.push(`/warehouse/shipments?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearch("");
        setChannelId("");
        setDateFrom("");
        setDateTo("");
        router.push("/warehouse/shipments");
    };

    const hasFilters = search || channelId || dateFrom || dateTo;

    return (
        <div className="rounded-xl bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
                {/* Event Filter */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-slate-500 mb-1 block">Event</label>
                    <select
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                        <option value="">ทุก Event</option>
                        {events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {event.name} ({event.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date From */}
                <div className="min-w-[160px]">
                    <label className="text-xs text-slate-500 mb-1 block">จากวันที่</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                </div>

                {/* Date To */}
                <div className="min-w-[160px]">
                    <label className="text-xs text-slate-500 mb-1 block">ถึงวันที่</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-slate-500 mb-1 block">ค้นหา</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="ค้นหาตาม tracking, สถานที่..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-10"
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
                <button
                    onClick={applyFilters}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Search className="inline-block h-4 w-4 mr-1" />
                    ค้นหา
                </button>
                {hasFilters && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <X className="inline-block h-4 w-4 mr-1" />
                        ล้างตัวกรอง
                    </button>
                )}
            </div>
        </div>
    );
}
