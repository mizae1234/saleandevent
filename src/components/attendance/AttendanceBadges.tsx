"use client";

import { Building2, Store, CalendarDays, CheckCircle2, AlertTriangle } from "lucide-react";
import { LOCATION_TYPES, DEFAULT_HQ_NAME } from "@/config/attendance";

export function LocationTypeIcon({
    locationType,
    className = "h-3.5 w-3.5 shrink-0",
}: {
    locationType: string;
    className?: string;
}) {
    if (locationType === LOCATION_TYPES.HQ) {
        return <Building2 className={`${className} text-indigo-600`} />;
    }
    if (locationType === LOCATION_TYPES.BRANCH) {
        return <Store className={`${className} text-emerald-600`} />;
    }
    return <CalendarDays className={`${className} text-teal-600`} />;
}

export function LocationTypeBadge({ locationType }: { locationType: string }) {
    if (locationType === LOCATION_TYPES.HQ) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                <Building2 className="h-3 w-3" /> {DEFAULT_HQ_NAME}
            </span>
        );
    }
    if (locationType === LOCATION_TYPES.BRANCH) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                <Store className="h-3 w-3" /> สาขา
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700">
            <CalendarDays className="h-3 w-3" /> Event
        </span>
    );
}

export function CheckInTimingBadge({ lateMinutes = 0 }: { lateMinutes?: number }) {
    if (lateMinutes > 0) {
        return (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                สาย {lateMinutes} นาที
            </span>
        );
    }
    return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">
            ตรงเวลา
        </span>
    );
}

export function AttendanceCompletionBadge({
    checkOutAt,
    isForgotCheckOut,
}: {
    checkOutAt: string | null;
    isForgotCheckOut: boolean;
}) {
    if (isForgotCheckOut) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="h-3 w-3" /> ลืม Check-out
            </span>
        );
    }
    if (checkOutAt) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> เข้า-ออกครบแล้ว
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 shrink-0">
            กำลังปฏิบัติงาน
        </span>
    );
}
