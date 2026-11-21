"use client";

import { Search } from "lucide-react";
import type { LocationConfigItem } from "../types";

interface AttendanceFilterBarProps {
    startDate: string;
    endDate: string;
    todayStr: string;
    locationFilter: string;
    statusFilter: string;
    searchQuery: string;
    channels: LocationConfigItem[];
    onStartDateChange: (val: string) => void;
    onEndDateChange: (val: string) => void;
    onLocationFilterChange: (val: string) => void;
    onStatusFilterChange: (val: string) => void;
    onSearchQueryChange: (val: string) => void;
}

export function AttendanceFilterBar({
    startDate,
    endDate,
    todayStr,
    locationFilter,
    statusFilter,
    searchQuery,
    channels,
    onStartDateChange,
    onEndDateChange,
    onLocationFilterChange,
    onStatusFilterChange,
    onSearchQueryChange,
}: AttendanceFilterBarProps) {
    return (
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        ตั้งแต่วันที่
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        ถึงวันที่
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => onEndDateChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        สถานที่ทำงาน
                    </label>
                    <select
                        value={locationFilter}
                        onChange={(e) => onLocationFilterChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                        <option value="ALL">ทุกสถานที่</option>
                        <option value="HQ">🏢 สำนักงานใหญ่เท่านั้น</option>
                        <option value="BRANCH">🏪 สาขา (Branch) ทั้งหมด</option>
                        <option value="EVENT">🎪 Event ทั้งหมด</option>
                        <optgroup label="เลือกเฉพาะสาขา / Event">
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                    [{ch.code}] {ch.name}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        สถานะการลงเวลา
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                        <option value="ALL">ทุกสถานะ</option>
                        <option value="NORMAL">✅ ปกติ (เข้า-ออกในพิกัด)</option>
                        <option value="FORGOT">⚠️ ลืม Check-out (นอกพื้นที่)</option>
                        <option value="WORKING">⏳ ยังไม่ Check-out</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        ค้นหาพนักงาน / สถานที่
                    </label>
                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                            placeholder="ชื่อ, รหัส S00xx..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400">ช่วงเวลาด่วน:</span>
                <button
                    type="button"
                    onClick={() => {
                        onStartDateChange(todayStr);
                        onEndDateChange(todayStr);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                    วันนี้
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onStartDateChange(todayStr.slice(0, 8) + "01");
                        onEndDateChange(todayStr);
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                    เดือนนี้
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onStartDateChange("");
                        onEndDateChange("");
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                    ทั้งหมด
                </button>
            </div>
        </div>
    );
}
