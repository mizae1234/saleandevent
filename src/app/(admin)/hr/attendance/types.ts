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

export interface HeadOfficeGpsConfig {
    branchName: string;
    latitude: number | null;
    longitude: number | null;
    checkInRadiusKm: number | null;
    workStartTime: string;
    workEndTime: string;
}
