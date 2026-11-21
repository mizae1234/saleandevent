/**
 * Centralized configuration, constants, types, and pure helpers
 * for the Employee Check-in / Check-out & Work Shift system.
 */

export const ATTENDANCE_TIMEZONE = "Asia/Bangkok";

export const DEFAULT_CHECK_IN_RADIUS_KM = 0.5;

export const DEFAULT_HQ_NAME = "สำนักงานใหญ่";
export const DEFAULT_HQ_BRANCH_CODE = "00000";

export const LOCATION_TYPES = {
    HQ: "HQ",
    BRANCH: "BRANCH",
    EVENT: "EVENT",
} as const;

export type LocationType = (typeof LOCATION_TYPES)[keyof typeof LOCATION_TYPES] | string;

export const DEFAULT_WORK_SHIFTS = {
    HQ: {
        start: "09:00",
        end: "18:00",
    },
    CHANNEL: {
        start: "10:00",
        end: "21:00",
    },
} as const;

export const RADIUS_PRESETS = [
    { label: "100 ม. (0.1 กม.)", value: "0.1" },
    { label: "200 ม. (0.2 กม.)", value: "0.2" },
    { label: "500 ม. (0.5 กม.)", value: "0.5" },
    { label: "1 กม.", value: "1" },
    { label: "2 กม.", value: "2" },
] as const;

export const SHIFT_PRESETS = [
    {
        label: `${DEFAULT_WORK_SHIFTS.HQ.start} – ${DEFAULT_WORK_SHIFTS.HQ.end} (สำนักงานใหญ่)`,
        start: DEFAULT_WORK_SHIFTS.HQ.start,
        end: DEFAULT_WORK_SHIFTS.HQ.end,
    },
    {
        label: `${DEFAULT_WORK_SHIFTS.CHANNEL.start} – ${DEFAULT_WORK_SHIFTS.CHANNEL.end} (ห้าง/Event)`,
        start: DEFAULT_WORK_SHIFTS.CHANNEL.start,
        end: DEFAULT_WORK_SHIFTS.CHANNEL.end,
    },
    { label: "10:00 – 22:00 (ห้างปิดดึก)", start: "10:00", end: "22:00" },
    { label: "08:00 – 20:00", start: "08:00", end: "20:00" },
] as const;

export interface SerializedCheckIn {
    id: string;
    channelId: string | null;
    locationType: string;
    locationName: string;
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
    shiftStartTime?: string | null;
    shiftEndTime?: string | null;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
}

/**
 * Resolves valid check-in radius in kilometers, falling back to DEFAULT_CHECK_IN_RADIUS_KM
 */
export function resolveCheckInRadius(radiusKm?: number | string | null): number {
    if (typeof radiusKm === "number") {
        return !Number.isNaN(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_CHECK_IN_RADIUS_KM;
    }
    if (typeof radiusKm === "string" && radiusKm.trim() !== "") {
        const parsed = parseFloat(radiusKm);
        return !Number.isNaN(parsed) && parsed > 0 ? parsed : DEFAULT_CHECK_IN_RADIUS_KM;
    }
    return DEFAULT_CHECK_IN_RADIUS_KM;
}

/**
 * Resolves shift start & end time based on whether the location is Head Office or a Channel (Event/Branch)
 */
export function resolveShiftTimes(options: {
    isHeadOffice?: boolean;
    locationType?: string | null;
    workStartTime?: string | null;
    workEndTime?: string | null;
}): { shiftStart: string; shiftEnd: string } {
    const isHq = Boolean(options.isHeadOffice || options.locationType === LOCATION_TYPES.HQ);
    const defaults = isHq ? DEFAULT_WORK_SHIFTS.HQ : DEFAULT_WORK_SHIFTS.CHANNEL;
    return {
        shiftStart: options.workStartTime?.trim() || defaults.start,
        shiftEnd: options.workEndTime?.trim() || defaults.end,
    };
}

/**
 * Returns Thai display label for locationType ('HQ' | 'BRANCH' | 'EVENT')
 */
export function getLocationTypeLabel(locationType: string): string {
    if (locationType === LOCATION_TYPES.HQ) return DEFAULT_HQ_NAME;
    if (locationType === LOCATION_TYPES.BRANCH) return "สาขา";
    return "Event";
}

/**
 * Formats an ISO timestamp string to HH:mm in Asia/Bangkok timezone
 */
export function formatBangkokTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("th-TH", {
        timeZone: ATTENDANCE_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Formats YYYY-MM-DD into a short Thai date (e.g., "12 พ.ย. 69")
 */
export function formatThaiShortDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "2-digit",
    });
}

/**
 * Formats YYYY-MM-DD into a Thai date with weekday (e.g., "พฤ. 12 พ.ย. 2569")
 */
export function formatThaiFullDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("th-TH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * Serializes a Prisma StaffCheckIn record for Client Components
 */
export function serializeStaffCheckIn(row: {
    id: string;
    channelId: string | null;
    locationType: string;
    locationName: string;
    checkInAt: Date;
    checkInLat: number;
    checkInLng: number;
    checkInDistanceKm: number | null;
    checkInPhotoUrl: string;
    checkInNote: string | null;
    checkOutAt: Date | null;
    checkOutLat: number | null;
    checkOutLng: number | null;
    checkOutDistanceKm: number | null;
    checkOutPhotoUrl: string | null;
    isForgotCheckOut: boolean;
    forgotCheckOutReason: string | null;
    hoursWorked: unknown;
    shiftStartTime?: string | null;
    shiftEndTime?: string | null;
    lateMinutes?: number;
    earlyLeaveMinutes?: number;
} | null): SerializedCheckIn | null {
    if (!row) return null;
    return {
        id: row.id,
        channelId: row.channelId,
        locationType: row.locationType,
        locationName: row.locationName,
        checkInAt: row.checkInAt.toISOString(),
        checkInLat: row.checkInLat,
        checkInLng: row.checkInLng,
        checkInDistanceKm: row.checkInDistanceKm,
        checkInPhotoUrl: row.checkInPhotoUrl,
        checkInNote: row.checkInNote,
        checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : null,
        checkOutLat: row.checkOutLat,
        checkOutLng: row.checkOutLng,
        checkOutDistanceKm: row.checkOutDistanceKm,
        checkOutPhotoUrl: row.checkOutPhotoUrl,
        isForgotCheckOut: row.isForgotCheckOut,
        forgotCheckOutReason: row.forgotCheckOutReason,
        hoursWorked: row.hoursWorked !== null && row.hoursWorked !== undefined ? Number(row.hoursWorked) : null,
        shiftStartTime: row.shiftStartTime ?? null,
        shiftEndTime: row.shiftEndTime ?? null,
        lateMinutes: row.lateMinutes ?? 0,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
    };
}
