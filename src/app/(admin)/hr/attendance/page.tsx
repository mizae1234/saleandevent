import { db } from "@/lib/db";
import { getCompanySetting } from "@/actions/company-setting-actions";
import { getBangkokDateString } from "@/actions/attendance-actions";
import {
    DEFAULT_HQ_NAME,
    resolveCheckInRadius,
    resolveShiftTimes,
} from "@/config/attendance";
import {
    AttendanceAdminClient,
    type AdminCheckInItem,
    type LocationConfigItem,
} from "./AttendanceAdminClient";

export const dynamic = "force-dynamic";

export default async function HrAttendancePage() {
    const [todayStr, companySetting, checkIns, channels] = await Promise.all([
        getBangkokDateString(),
        getCompanySetting(),
        db.staffCheckIn.findMany({
            include: {
                staff: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        role: true,
                        position: true,
                    },
                },
            },
            orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
            take: 1000,
        }),
        db.salesChannel.findMany({
            where: { isActive: true },
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                location: true,
                latitude: true,
                longitude: true,
                checkInRadiusKm: true,
                workStartTime: true,
                workEndTime: true,
            },
            orderBy: [{ type: "asc" }, { code: "desc" }],
        }),
    ]);

    const serializedCheckIns: AdminCheckInItem[] = checkIns.map((row) => ({
        id: row.id,
        staffId: row.staffId,
        staffCode: row.staff.code,
        staffName: row.staff.name,
        staffRole: row.staff.role,
        staffPosition: row.staff.position,
        channelId: row.channelId,
        locationType: row.locationType,
        locationName: row.locationName,
        dateStr: row.date.toISOString().split("T")[0],
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
        hoursWorked: row.hoursWorked ? Number(row.hoursWorked) : null,
        shiftStartTime: row.shiftStartTime,
        shiftEndTime: row.shiftEndTime,
        lateMinutes: row.lateMinutes,
        earlyLeaveMinutes: row.earlyLeaveMinutes,
    }));

    const serializedChannels: LocationConfigItem[] = channels.map((ch) => {
        const { shiftStart, shiftEnd } = resolveShiftTimes({
            isHeadOffice: false,
            workStartTime: ch.workStartTime,
            workEndTime: ch.workEndTime,
        });
        return {
            id: ch.id,
            code: ch.code,
            name: ch.name,
            type: ch.type,
            location: ch.location,
            latitude: ch.latitude,
            longitude: ch.longitude,
            checkInRadiusKm: ch.checkInRadiusKm,
            workStartTime: shiftStart,
            workEndTime: shiftEnd,
        };
    });

    const hqShift = resolveShiftTimes({
        isHeadOffice: true,
        workStartTime: companySetting.workStartTime,
        workEndTime: companySetting.workEndTime,
    });

    return (
        <AttendanceAdminClient
            initialCheckIns={serializedCheckIns}
            todayStr={todayStr}
            headOfficeConfig={{
                branchName: companySetting.branchName || DEFAULT_HQ_NAME,
                latitude: companySetting.latitude,
                longitude: companySetting.longitude,
                checkInRadiusKm: resolveCheckInRadius(companySetting.checkInRadiusKm),
                workStartTime: hqShift.shiftStart,
                workEndTime: hqShift.shiftEnd,
            }}
            channels={serializedChannels}
        />
    );
}

