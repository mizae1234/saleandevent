"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
    Clock,
    Download,
    Building2,
    Settings2,
} from "lucide-react";
import {
    DEFAULT_CHECK_IN_RADIUS_KM,
    DEFAULT_HQ_NAME,
    LOCATION_TYPES,
    formatBangkokTime,
    getLocationTypeLabel,
    resolveShiftTimes,
} from "@/config/attendance";
import { PhotoLightboxModal, type PhotoLightboxData } from "@/components/attendance";
import { AttendanceFilterBar } from "./components/AttendanceFilterBar";
import { AttendanceTable } from "./components/AttendanceTable";
import { LocationGpsConfigModal } from "./components/LocationGpsConfigModal";
import type {
    AdminCheckInItem,
    HeadOfficeGpsConfig,
    LocationConfigItem,
} from "./types";

export type { AdminCheckInItem, LocationConfigItem, HeadOfficeGpsConfig };

interface Props {
    initialCheckIns: AdminCheckInItem[];
    todayStr: string;
    headOfficeConfig: HeadOfficeGpsConfig;
    channels: LocationConfigItem[];
}

export function AttendanceAdminClient({
    initialCheckIns,
    todayStr,
    headOfficeConfig,
    channels,
}: Props) {
    const router = useRouter();

    // Filters
    const [startDate, setStartDate] = useState(todayStr.slice(0, 8) + "01"); // Default 1st of current month
    const [endDate, setEndDate] = useState(todayStr);
    const [locationFilter, setLocationFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [previewPhoto, setPreviewPhoto] = useState<PhotoLightboxData | null>(null);
    const [gpsModalTarget, setGpsModalTarget] = useState<string | null>(null);

    // Filtered items
    const filtered = useMemo(() => {
        return initialCheckIns.filter((item) => {
            if (startDate && item.dateStr < startDate) return false;
            if (endDate && item.dateStr > endDate) return false;

            if (locationFilter === LOCATION_TYPES.HQ && item.locationType !== LOCATION_TYPES.HQ)
                return false;
            if (
                locationFilter === LOCATION_TYPES.BRANCH &&
                item.locationType !== LOCATION_TYPES.BRANCH
            )
                return false;
            if (
                locationFilter === LOCATION_TYPES.EVENT &&
                item.locationType !== LOCATION_TYPES.EVENT
            )
                return false;
            if (
                ![
                    "ALL",
                    LOCATION_TYPES.HQ,
                    LOCATION_TYPES.BRANCH,
                    LOCATION_TYPES.EVENT,
                ].includes(locationFilter) &&
                item.channelId !== locationFilter
            ) {
                return false;
            }

            if (statusFilter === "NORMAL" && (!item.checkOutAt || item.isForgotCheckOut)) {
                return false;
            }
            if (statusFilter === "FORGOT" && !item.isForgotCheckOut) {
                return false;
            }
            if (statusFilter === "WORKING" && item.checkOutAt !== null) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = item.staffName.toLowerCase().includes(q);
                const matchCode = (item.staffCode || "").toLowerCase().includes(q);
                const matchLoc = item.locationName.toLowerCase().includes(q);
                if (!matchName && !matchCode && !matchLoc) return false;
            }

            return true;
        });
    }, [initialCheckIns, startDate, endDate, locationFilter, statusFilter, searchQuery]);

    // Summary stats
    const stats = useMemo(() => {
        const total = filtered.length;
        const normal = filtered.filter((i) => i.checkOutAt && !i.isForgotCheckOut).length;
        const forgot = filtered.filter((i) => i.isForgotCheckOut).length;
        const working = filtered.filter((i) => !i.checkOutAt).length;
        return { total, normal, forgot, working };
    }, [filtered]);

    const handleExportExcel = () => {
        const rows = filtered.map((item, idx) => {
            const { shiftStart, shiftEnd } = resolveShiftTimes({
                locationType: item.locationType,
                workStartTime: item.shiftStartTime,
                workEndTime: item.shiftEndTime,
            });
            return {
                ลำดับ: idx + 1,
                วันที่: item.dateStr,
                รหัสพนักงาน: item.staffCode || "-",
                "ชื่อ-นามสกุล": item.staffName,
                ตำแหน่ง: item.staffPosition || item.staffRole,
                ประเภทสถานที่: getLocationTypeLabel(item.locationType),
                สถานที่ทำงาน: item.locationName,
                กะทำงาน: `${shiftStart} - ${shiftEnd}`,
                "เวลาเข้างาน (Check-in)": formatBangkokTime(item.checkInAt),
                "มาสาย (นาที)": item.lateMinutes || 0,
                "ระยะห่างตอนเข้า (กม.)":
                    item.checkInDistanceKm !== null ? item.checkInDistanceKm : "-",
                "พิกัดเข้างาน": `${item.checkInLat}, ${item.checkInLng}`,
                "หมายเหตุเข้างาน": item.checkInNote || "",
                "เวลาออกงาน (Check-out)": item.checkOutAt
                    ? formatBangkokTime(item.checkOutAt)
                    : "ยังไม่ Check-out",
                "ระยะห่างตอนออก (กม.)":
                    item.checkOutDistanceKm !== null ? item.checkOutDistanceKm : "-",
                "สถานะออกงาน": !item.checkOutAt
                    ? "กำลังปฏิบัติงาน"
                    : item.isForgotCheckOut
                    ? "ลืม Check-out (นอกพื้นที่)"
                    : "ปกติ",
                "เหตุผลลืม Check-out": item.forgotCheckOutReason || "",
                "ชั่วโมงทำงาน (ชม.)": item.hoursWorked ?? "-",
                "ลิงก์รูปเข้างาน": item.checkInPhotoUrl,
                "ลิงก์รูปออกงาน": item.checkOutPhotoUrl || "",
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `Attendance_${startDate || "all"}_${endDate || "all"}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                        <Clock className="h-7 w-7 text-teal-600" />
                        ระบบลงเวลาเข้า-ออกงาน (Check-in / Check-out)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        ตรวจสอบภาพถ่ายหน้างาน, พิกัด GPS, ระยะห่าง และรายการลืม Check-out ของพนักงานทั้งหมด
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setGpsModalTarget(LOCATION_TYPES.HQ)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-2xs transition-colors cursor-pointer"
                    >
                        <Settings2 className="h-4 w-4 text-teal-600" />
                        ตั้งค่าพิกัดสำนักงานใหญ่ / สาขา
                    </button>

                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={filtered.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium shadow-sm transition-colors cursor-pointer"
                    >
                        <Download className="h-4 w-4" />
                        ส่งออก Excel ({filtered.length})
                    </button>
                </div>
            </div>

            {/* Head Office GPS Quick Status Banner */}
            <div className="rounded-xl bg-indigo-50/60 border border-indigo-200/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-900">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>
                        <strong>
                            พิกัด {headOfficeConfig.branchName || DEFAULT_HQ_NAME}:
                        </strong>{" "}
                        {headOfficeConfig.latitude !== null &&
                        headOfficeConfig.longitude !== null ? (
                            <span className="font-mono">
                                {headOfficeConfig.latitude.toFixed(6)},{" "}
                                {headOfficeConfig.longitude.toFixed(6)} (รัศมีไม่เกิน{" "}
                                {headOfficeConfig.checkInRadiusKm ?? DEFAULT_CHECK_IN_RADIUS_KM} กม. • กะ{" "}
                                {headOfficeConfig.workStartTime}–{headOfficeConfig.workEndTime} น.)
                            </span>
                        ) : (
                            <span className="text-amber-700 font-semibold">
                                ยังไม่ได้ระบุพิกัด GPS (กรุณากดปุ่มตั้งค่าพิกัดเพื่อให้พนักงานสำนักงานใหญ่ Check-in ได้)
                            </span>
                        )}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setGpsModalTarget(LOCATION_TYPES.HQ)}
                    className="text-indigo-700 hover:text-indigo-900 font-semibold underline shrink-0 text-left"
                >
                    แก้ไขพิกัดสำนักงานใหญ่ →
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs">
                    <p className="text-xs text-slate-500">รายการลงเวลาทั้งหมด</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-2xs">
                    <p className="text-xs text-emerald-600">เข้า-ออกครบตามพิกัด</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.normal}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-2xs">
                    <p className="text-xs text-amber-600">ลืม Check-out (นอกพื้นที่)</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{stats.forgot}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-2xs">
                    <p className="text-xs text-blue-600">กำลังปฏิบัติงาน (ยังไม่ Check-out)</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{stats.working}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <AttendanceFilterBar
                startDate={startDate}
                endDate={endDate}
                todayStr={todayStr}
                locationFilter={locationFilter}
                statusFilter={statusFilter}
                searchQuery={searchQuery}
                channels={channels}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onLocationFilterChange={setLocationFilter}
                onStatusFilterChange={setStatusFilter}
                onSearchQueryChange={setSearchQuery}
            />

            {/* Table */}
            <AttendanceTable items={filtered} onPreviewPhoto={setPreviewPhoto} />

            {/* Quick GPS Config Modal */}
            {gpsModalTarget && (
                <LocationGpsConfigModal
                    initialTarget={gpsModalTarget}
                    headOfficeConfig={headOfficeConfig}
                    channels={channels}
                    onClose={() => setGpsModalTarget(null)}
                    onSuccess={() => router.refresh()}
                />
            )}

            {/* Photo Preview Modal */}
            <PhotoLightboxModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
        </div>
    );
}
