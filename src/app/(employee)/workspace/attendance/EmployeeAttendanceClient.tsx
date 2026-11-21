"use client";

import { useState, useMemo } from "react";
import {
    Clock,
    Calendar,
    ChevronLeft,
    ChevronRight,
    MapPin,
} from "lucide-react";
import { formatDistanceThai } from "@/lib/geo";
import {
    formatBangkokTime,
    formatThaiFullDate,
    resolveShiftTimes,
} from "@/config/attendance";
import {
    LocationTypeIcon,
    CheckInTimingBadge,
    AttendanceCompletionBadge,
    PhotoLightboxModal,
    type PhotoLightboxData,
} from "@/components/attendance";

export interface EmployeeAttendanceRecord {
    id: string;
    dateStr: string; // YYYY-MM-DD
    monthStr: string; // YYYY-MM
    locationType: string; // HQ, BRANCH, EVENT
    locationName: string;
    checkInAt: string;
    checkInDistanceKm: number | null;
    checkInPhotoUrl: string;
    checkInNote: string | null;
    checkOutAt: string | null;
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

interface MonthOption {
    value: string; // YYYY-MM
    label: string; // พฤศจิกายน 2569
}

interface Props {
    records: EmployeeAttendanceRecord[];
    defaultMonth: string; // YYYY-MM (current month)
    monthOptions: MonthOption[];
    staffName: string;
}

export function EmployeeAttendanceClient({
    records,
    defaultMonth,
    monthOptions,
    staffName,
}: Props) {
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [previewPhoto, setPreviewPhoto] = useState<PhotoLightboxData | null>(null);

    const currentMonthIdx = monthOptions.findIndex((m) => m.value === selectedMonth);

    const handlePrevMonth = () => {
        if (currentMonthIdx < monthOptions.length - 1) {
            setSelectedMonth(monthOptions[currentMonthIdx + 1].value);
        }
    };

    const handleNextMonth = () => {
        if (currentMonthIdx > 0) {
            setSelectedMonth(monthOptions[currentMonthIdx - 1].value);
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter((r) => r.monthStr === selectedMonth);
    }, [records, selectedMonth]);

    const stats = useMemo(() => {
        const totalDays = filteredRecords.length;
        const onTimeDays = filteredRecords.filter((r) => (r.lateMinutes || 0) === 0).length;
        const completedDays = filteredRecords.filter(
            (r) => r.checkOutAt && !r.isForgotCheckOut
        ).length;
        const forgotDays = filteredRecords.filter((r) => r.isForgotCheckOut).length;
        return {
            totalDays,
            onTimeDays,
            completedDays,
            forgotDays,
        };
    }, [filteredRecords]);

    const selectedMonthLabel =
        monthOptions.find((m) => m.value === selectedMonth)?.label || selectedMonth;

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-teal-600" />
                    ประวัติการเข้า-ออกงานของฉัน
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                    พนักงาน: <span className="font-medium text-slate-700">{staffName}</span>
                </p>
            </div>

            {/* Month Selector Bar */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-teal-600" />
                        เลือกเดือนที่ต้องการดูประวัติ
                    </span>
                    {selectedMonth === defaultMonth && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                            เดือนปัจจุบัน
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        disabled={currentMonthIdx >= monthOptions.length - 1}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        title="เดือนก่อนหน้า"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                        {monthOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                                {opt.value === defaultMonth ? " (เดือนปัจจุบัน)" : ""}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={handleNextMonth}
                        disabled={currentMonthIdx <= 0}
                        className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        title="เดือนถัดไป"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-teal-600 font-medium">เข้างานตรงเวลา</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.onTimeDays}{" "}
                        <span className="text-xs font-normal text-slate-400">วัน</span>
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-emerald-600 font-medium">เข้า-ออกครบปกติ</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.completedDays}{" "}
                        <span className="text-xs font-normal text-slate-400">วัน</span>
                    </p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-amber-600 font-medium">ลืม Check-out</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stats.forgotDays}{" "}
                        <span className="text-xs font-normal text-slate-400">วัน</span>
                    </p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 p-4 text-white shadow-sm">
                    <p className="text-xs text-white/80">รวมวันทำงาน</p>
                    <p className="text-2xl font-bold mt-1">
                        {stats.totalDays} <span className="text-xs font-normal">วัน</span>
                    </p>
                </div>
            </div>

            {/* Daily List for Selected Month */}
            <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    รายการลงเวลาประจำเดือน {selectedMonthLabel} ({filteredRecords.length} วัน)
                </h2>

                {filteredRecords.map((item) => {
                    const { shiftStart, shiftEnd } = resolveShiftTimes({
                        locationType: item.locationType,
                        workStartTime: item.shiftStartTime,
                        workEndTime: item.shiftEndTime,
                    });

                    return (
                        <div
                            key={item.id}
                            className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3"
                        >
                            {/* Top row: Date & Status Badge */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">
                                        {formatThaiFullDate(item.dateStr)}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                        <LocationTypeIcon locationType={item.locationType} />
                                        <span className="font-medium text-slate-700">
                                            {item.locationName}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            (กะ {shiftStart}–{shiftEnd} น.)
                                        </span>
                                    </div>
                                </div>

                                <AttendanceCompletionBadge
                                    checkOutAt={item.checkOutAt}
                                    isForgotCheckOut={item.isForgotCheckOut}
                                />
                            </div>

                            {/* Check-in & Check-out Grid */}
                            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                {/* Check-in */}
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPreviewPhoto({
                                                url: item.checkInPhotoUrl,
                                                title: `รูปเข้างาน (${formatThaiFullDate(item.dateStr)})`,
                                                subtitle: `${item.locationName} • เวลา ${formatBangkokTime(
                                                    item.checkInAt
                                                )} น.`,
                                            })
                                        }
                                        className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shrink-0"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.checkInPhotoUrl}
                                            alt="Check-in"
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                เข้างาน
                                            </span>
                                            <CheckInTimingBadge lateMinutes={item.lateMinutes} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                                            {formatBangkokTime(item.checkInAt)} น.
                                        </p>
                                        {item.checkInDistanceKm !== null && (
                                            <p className="text-[11px] text-slate-400 truncate">
                                                ห่าง {formatDistanceThai(item.checkInDistanceKm)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Check-out */}
                                <div className="flex items-center gap-2.5 border-l border-slate-200 pl-2.5">
                                    {item.checkOutAt ? (
                                        <>
                                            {item.checkOutPhotoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPreviewPhoto({
                                                            url: item.checkOutPhotoUrl!,
                                                            title: `รูปออกงาน (${formatThaiFullDate(
                                                                item.dateStr
                                                            )})`,
                                                            subtitle: `${item.locationName} • เวลา ${formatBangkokTime(
                                                                item.checkOutAt!
                                                            )} น.`,
                                                        })
                                                    }
                                                    className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-200 shrink-0"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={item.checkOutPhotoUrl}
                                                        alt="Check-out"
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>
                                            )}
                                            <div className="min-w-0">
                                                <span
                                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                        item.isForgotCheckOut
                                                            ? "text-amber-700 bg-amber-50"
                                                            : "text-blue-700 bg-blue-50"
                                                    }`}
                                                >
                                                    ออกงาน
                                                </span>
                                                <p className="text-sm font-bold text-slate-900 mt-0.5">
                                                    {formatBangkokTime(item.checkOutAt)} น.
                                                </p>
                                                {item.checkOutDistanceKm !== null && (
                                                    <p className="text-[11px] text-slate-400 truncate">
                                                        ห่าง {formatDistanceThai(item.checkOutDistanceKm)}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-xs text-amber-600 font-medium">
                                            ยังไม่ได้กด Check-out
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(item.checkInNote || item.forgotCheckOutReason) && (
                                <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-50">
                                    {item.checkInNote && <p>หมายเหตุเข้างาน: {item.checkInNote}</p>}
                                    {item.forgotCheckOutReason && (
                                        <p className="text-amber-700">
                                            หมายเหตุออกงานนอกพื้นที่: {item.forgotCheckOutReason}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredRecords.length === 0 && (
                    <div className="rounded-2xl bg-white p-10 text-center border border-slate-100 shadow-sm">
                        <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">
                            ไม่มีประวัติการลงเวลาในเดือน {selectedMonthLabel}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            คุณสามารถกด Check-in / Check-out ได้ที่เมนู &quot;หน้าหลัก&quot;
                        </p>
                    </div>
                )}
            </div>

            <PhotoLightboxModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
        </div>
    );
}
