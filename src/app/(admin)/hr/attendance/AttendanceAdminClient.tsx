"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
    Clock,
    MapPin,
    Download,
    Search,
    Building2,
    Store,
    CalendarDays,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    X,
    Settings2,
    Save,
} from "lucide-react";
import { GpsCoordinatePicker, Spinner } from "@/components/shared";
import { updateLocationGpsConfig } from "@/actions/attendance-actions";
import { formatDistanceThai } from "@/lib/geo";
import { useToast } from "@/components/ui/toast";

export interface AdminCheckInItem {
    id: string;
    staffId: string;
    staffCode: string | null;
    staffName: string;
    staffRole: string;
    staffPosition: string | null;
    channelId: string | null;
    locationType: string; // HQ, BRANCH, EVENT
    locationName: string;
    dateStr: string; // YYYY-MM-DD
    checkInAt: string;
    checkInLat: number;
    checkInLng: number;
    checkInDistanceKm: number | null;
    checkInPhotoUrl: string;
    checkInNote: string | null;
    checkOutAt: string | null;
    checkOutLat: number | null;
    checkOutLng: number | null;
    checkOutDistanceKm: number | null;
    checkOutPhotoUrl: string | null;
    isForgotCheckOut: boolean;
    forgotCheckOutReason: string | null;
    hoursWorked: number | null;
    shiftStartTime: string | null;
    shiftEndTime: string | null;
    lateMinutes: number;
    earlyLeaveMinutes: number;
}

export interface LocationConfigItem {
    id: string;
    code: string;
    name: string;
    type: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    checkInRadiusKm: number | null;
    workStartTime: string;
    workEndTime: string;
}

interface Props {
    initialCheckIns: AdminCheckInItem[];
    todayStr: string;
    headOfficeConfig: {
        branchName: string;
        latitude: number | null;
        longitude: number | null;
        checkInRadiusKm: number | null;
        workStartTime: string;
        workEndTime: string;
    };
    channels: LocationConfigItem[];
}

export function AttendanceAdminClient({
    initialCheckIns,
    todayStr,
    headOfficeConfig,
    channels,
}: Props) {
    const router = useRouter();
    const { toastSuccess, toastError } = useToast();
    const [isPending, startTransition] = useTransition();

    // Filters
    const [startDate, setStartDate] = useState(todayStr.slice(0, 8) + "01"); // Default 1st of current month
    const [endDate, setEndDate] = useState(todayStr);
    const [locationFilter, setLocationFilter] = useState<string>("ALL"); // ALL, HQ, BRANCH, EVENT, or channelId
    const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, NORMAL, FORGOT, WORKING
    const [searchQuery, setSearchQuery] = useState("");

    // Lightbox modal
    const [previewPhoto, setPreviewPhoto] = useState<{
        url: string;
        title: string;
        subtitle: string;
    } | null>(null);

    // GPS Config Modal
    const [showGpsModal, setShowGpsModal] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<string>("HQ"); // 'HQ' or channelId
    const [gpsLat, setGpsLat] = useState(
        headOfficeConfig.latitude !== null ? String(headOfficeConfig.latitude) : ""
    );
    const [gpsLng, setGpsLng] = useState(
        headOfficeConfig.longitude !== null ? String(headOfficeConfig.longitude) : ""
    );
    const [gpsRadius, setGpsRadius] = useState(
        String(headOfficeConfig.checkInRadiusKm ?? 0.5)
    );
    const [gpsWorkStart, setGpsWorkStart] = useState(
        headOfficeConfig.workStartTime || "09:00"
    );
    const [gpsWorkEnd, setGpsWorkEnd] = useState(
        headOfficeConfig.workEndTime || "18:00"
    );

    const handleSelectGpsTarget = (target: string) => {
        setSelectedTarget(target);
        if (target === "HQ") {
            setGpsLat(headOfficeConfig.latitude !== null ? String(headOfficeConfig.latitude) : "");
            setGpsLng(headOfficeConfig.longitude !== null ? String(headOfficeConfig.longitude) : "");
            setGpsRadius(String(headOfficeConfig.checkInRadiusKm ?? 0.5));
            setGpsWorkStart(headOfficeConfig.workStartTime || "09:00");
            setGpsWorkEnd(headOfficeConfig.workEndTime || "18:00");
        } else {
            const ch = channels.find((c) => c.id === target);
            if (ch) {
                setGpsLat(ch.latitude !== null ? String(ch.latitude) : "");
                setGpsLng(ch.longitude !== null ? String(ch.longitude) : "");
                setGpsRadius(String(ch.checkInRadiusKm ?? 0.5));
                setGpsWorkStart(ch.workStartTime || "10:00");
                setGpsWorkEnd(ch.workEndTime || "21:00");
            }
        }
    };

    const handleSaveGpsConfig = () => {
        const lat = parseFloat(gpsLat);
        const lng = parseFloat(gpsLng);
        const rad = parseFloat(gpsRadius) || 0.5;

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            toastError("กรุณาระบุพิกัด Latitude และ Longitude ให้ถูกต้อง");
            return;
        }

        startTransition(async () => {
            const res = await updateLocationGpsConfig({
                targetType: selectedTarget === "HQ" ? "HQ" : "CHANNEL",
                channelId: selectedTarget === "HQ" ? undefined : selectedTarget,
                latitude: lat,
                longitude: lng,
                checkInRadiusKm: rad,
                workStartTime: gpsWorkStart,
                workEndTime: gpsWorkEnd,
            });
            if (res.error) {
                toastError(res.error);
            } else {
                toastSuccess("บันทึกพิกัด รัศมี และกะเวลาเข้า-ออกงานเรียบร้อยแล้ว");
                setShowGpsModal(false);
                router.refresh();
            }
        });
    };

    // Filtered items
    const filtered = useMemo(() => {
        return initialCheckIns.filter((item) => {
            if (startDate && item.dateStr < startDate) return false;
            if (endDate && item.dateStr > endDate) return false;

            if (locationFilter === "HQ" && item.locationType !== "HQ") return false;
            if (locationFilter === "BRANCH" && item.locationType !== "BRANCH") return false;
            if (locationFilter === "EVENT" && item.locationType !== "EVENT") return false;
            if (
                !["ALL", "HQ", "BRANCH", "EVENT"].includes(locationFilter) &&
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

    const formatThaiDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "2-digit",
        });
    };

    const formatThaiTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const handleExportExcel = () => {
        const rows = filtered.map((item, idx) => ({
            ลำดับ: idx + 1,
            วันที่: item.dateStr,
            รหัสพนักงาน: item.staffCode || "-",
            "ชื่อ-นามสกุล": item.staffName,
            ตำแหน่ง: item.staffPosition || item.staffRole,
            ประเภทสถานที่:
                item.locationType === "HQ"
                    ? "สำนักงานใหญ่"
                    : item.locationType === "BRANCH"
                    ? "สาขา"
                    : "Event",
            สถานที่ทำงาน: item.locationName,
            กะทำงาน: `${item.shiftStartTime || (item.locationType === "HQ" ? "09:00" : "10:00")} - ${item.shiftEndTime || (item.locationType === "HQ" ? "18:00" : "21:00")}`,
            "เวลาเข้างาน (Check-in)": formatThaiTime(item.checkInAt),
            "มาสาย (นาที)": item.lateMinutes || 0,
            "ระยะห่างตอนเข้า (กม.)":
                item.checkInDistanceKm !== null ? item.checkInDistanceKm : "-",
            "พิกัดเข้างาน": `${item.checkInLat}, ${item.checkInLng}`,
            "หมายเหตุเข้างาน": item.checkInNote || "",
            "เวลาออกงาน (Check-out)": item.checkOutAt
                ? formatThaiTime(item.checkOutAt)
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
        }));

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
                        onClick={() => setShowGpsModal(true)}
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
                        <strong>พิกัด {headOfficeConfig.branchName || "สำนักงานใหญ่"}:</strong>{" "}
                        {headOfficeConfig.latitude !== null && headOfficeConfig.longitude !== null ? (
                            <span className="font-mono">
                                {headOfficeConfig.latitude.toFixed(6)},{" "}
                                {headOfficeConfig.longitude.toFixed(6)} (รัศมีไม่เกิน{" "}
                                {headOfficeConfig.checkInRadiusKm ?? 0.5} กม.)
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
                    onClick={() => {
                        handleSelectGpsTarget("HQ");
                        setShowGpsModal(true);
                    }}
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
            <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            ตั้งแต่วันที่
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
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
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            สถานที่ทำงาน
                        </label>
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
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
                            onChange={(e) => setStatusFilter(e.target.value)}
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
                                onChange={(e) => setSearchQuery(e.target.value)}
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
                            setStartDate(todayStr);
                            setEndDate(todayStr);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                        วันนี้
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setStartDate(todayStr.slice(0, 8) + "01");
                            setEndDate(todayStr);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                        เดือนนี้
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setStartDate("");
                            setEndDate("");
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                        ทั้งหมด
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold text-slate-600">
                                <th className="px-4 py-3.5">วันที่</th>
                                <th className="px-4 py-3.5">พนักงาน</th>
                                <th className="px-4 py-3.5">สถานที่</th>
                                <th className="px-4 py-3.5">เข้างาน (Check-in)</th>
                                <th className="px-4 py-3.5">ออกงาน (Check-out)</th>
                                <th className="px-4 py-3.5 text-center">รวมเวลา</th>
                                <th className="px-4 py-3.5">สถานะ / หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                    {/* Date */}
                                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                                        {formatThaiDate(item.dateStr)}
                                    </td>

                                    {/* Staff */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-slate-900">
                                            {item.staffName}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                            <span className="font-mono text-teal-600">
                                                {item.staffCode || "-"}
                                            </span>
                                            <span>•</span>
                                            <span>{item.staffPosition || item.staffRole}</span>
                                        </div>
                                    </td>

                                    {/* Location */}
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            {item.locationType === "HQ" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                                                    <Building2 className="h-3 w-3" /> สำนักงานใหญ่
                                                </span>
                                            ) : item.locationType === "BRANCH" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                                                    <Store className="h-3 w-3" /> สาขา
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700">
                                                    <CalendarDays className="h-3 w-3" /> Event
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-medium text-slate-800 mt-1">
                                            {item.locationName}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            กะ {item.shiftStartTime || (item.locationType === "HQ" ? "09:00" : "10:00")}–{item.shiftEndTime || (item.locationType === "HQ" ? "18:00" : "21:00")} น.
                                        </div>
                                    </td>

                                    {/* Check-in */}
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewPhoto({
                                                        url: item.checkInPhotoUrl,
                                                        title: `Check-in: ${item.staffName}`,
                                                        subtitle: `${item.locationName} • ${formatThaiDate(
                                                            item.dateStr
                                                        )} ${formatThaiTime(item.checkInAt)} น.`,
                                                    })
                                                }
                                                className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={item.checkInPhotoUrl}
                                                    alt="Check-in"
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-900">
                                                        {formatThaiTime(item.checkInAt)} น.
                                                    </span>
                                                    {item.lateMinutes > 0 ? (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                                                            สาย {item.lateMinutes} นาที
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
                                                            ตรงเวลา
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                    {item.checkInDistanceKm !== null && (
                                                        <span>
                                                            ห่าง{" "}
                                                            {formatDistanceThai(
                                                                item.checkInDistanceKm
                                                            )}
                                                        </span>
                                                    )}
                                                    <a
                                                        href={`https://www.google.com/maps?q=${item.checkInLat},${item.checkInLng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-teal-600 hover:underline inline-flex items-center gap-0.5"
                                                        title="ดูพิกัดบน Google Maps"
                                                    >
                                                        <MapPin className="h-3 w-3" /> แผนที่
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Check-out */}
                                    <td className="px-4 py-3.5">
                                        {item.checkOutAt ? (
                                            <div className="flex items-center gap-2.5">
                                                {item.checkOutPhotoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPreviewPhoto({
                                                                url: item.checkOutPhotoUrl!,
                                                                title: `Check-out: ${item.staffName}`,
                                                                subtitle: `${item.locationName} • ${formatThaiDate(
                                                                    item.dateStr
                                                                )} ${formatThaiTime(item.checkOutAt!)} น.`,
                                                            })
                                                        }
                                                        className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:ring-2 hover:ring-amber-500 transition-all"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.checkOutPhotoUrl}
                                                            alt="Check-out"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900">
                                                        {formatThaiTime(item.checkOutAt)} น.
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        {item.checkOutDistanceKm !== null && (
                                                            <span>
                                                                ห่าง{" "}
                                                                {formatDistanceThai(
                                                                    item.checkOutDistanceKm
                                                                )}
                                                            </span>
                                                        )}
                                                        {item.checkOutLat !== null &&
                                                            item.checkOutLng !== null && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${item.checkOutLat},${item.checkOutLng}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-teal-600 hover:underline inline-flex items-center gap-0.5"
                                                                >
                                                                    <MapPin className="h-3 w-3" /> แผนที่
                                                                </a>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                กำลังปฏิบัติงาน
                                            </span>
                                        )}
                                    </td>

                                    {/* Hours worked */}
                                    <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-700">
                                        {item.hoursWorked !== null ? `${item.hoursWorked} ชม.` : "-"}
                                    </td>

                                    {/* Status & Notes */}
                                    <td className="px-4 py-3.5">
                                        {item.isForgotCheckOut ? (
                                            <div className="space-y-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                    <AlertTriangle className="h-3 w-3" /> ลืม Check-out (นอกพื้นที่)
                                                </span>
                                                {item.forgotCheckOutReason && (
                                                    <p className="text-xs text-amber-800">
                                                        เหตุผล: {item.forgotCheckOutReason}
                                                    </p>
                                                )}
                                            </div>
                                        ) : item.checkOutAt ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="h-3 w-3" /> ปกติ
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">รอ Check-out</span>
                                        )}
                                        {item.checkInNote && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                หมายเหตุ: {item.checkInNote}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        ไม่พบรายการลงเวลาเข้า-ออกงานตามเงื่อนไขที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick GPS Config Modal */}
            {showGpsModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    ตั้งค่าพิกัด GPS และรัศมี Check-in
                                </h3>
                                <p className="text-xs text-slate-500">
                                    เลือกสำนักงานใหญ่ หรือ สาขา / Event ที่ต้องการกำหนดพิกัด
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGpsModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                เลือกสถานที่ที่ต้องการตั้งค่าพิกัด
                            </label>
                            <select
                                value={selectedTarget}
                                onChange={(e) => handleSelectGpsTarget(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white font-medium"
                            >
                                <option value="HQ">
                                    🏢 {headOfficeConfig.branchName || "สำนักงานใหญ่"} (Head Office)
                                </option>
                                <optgroup label="สาขา / Event ทั้งหมด">
                                    {channels.map((ch) => (
                                        <option key={ch.id} value={ch.id}>
                                            [{ch.code}] {ch.name}{" "}
                                            {ch.latitude !== null
                                                ? `(ตั้งค่าแล้ว: ${ch.checkInRadiusKm ?? 0.5} กม.)`
                                                : "(ยังไม่ระบุพิกัด)"}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <GpsCoordinatePicker
                            latitude={gpsLat}
                            longitude={gpsLng}
                            checkInRadiusKm={gpsRadius}
                            workStartTime={gpsWorkStart}
                            workEndTime={gpsWorkEnd}
                            onChange={(vals) => {
                                setGpsLat(vals.latitude);
                                setGpsLng(vals.longitude);
                                setGpsRadius(vals.checkInRadiusKm);
                                if (vals.workStartTime !== undefined) setGpsWorkStart(vals.workStartTime);
                                if (vals.workEndTime !== undefined) setGpsWorkEnd(vals.workEndTime);
                            }}
                            required
                            showShiftTime
                            title="พิกัด รัศมี และกะเวลาเข้า-ออกงาน"
                        />

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowGpsModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveGpsConfig}
                                disabled={isPending}
                                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                                {isPending ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                                <span>บันทึกพิกัด</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Preview Modal */}
            {previewPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewPhoto(null)}
                >
                    <div
                        className="bg-white rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-bold">{previewPhoto.title}</h4>
                                <p className="text-xs text-slate-300">{previewPhoto.subtitle}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewPhoto(null)}
                                className="p-1 text-slate-300 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewPhoto.url}
                            alt={previewPhoto.title}
                            className="w-full max-h-[75vh] object-contain bg-black"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

