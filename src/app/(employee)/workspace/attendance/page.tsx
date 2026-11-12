import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBangkokDateString } from "@/actions/attendance-actions";
import {
    EmployeeAttendanceClient,
    type EmployeeAttendanceRecord,
} from "./EmployeeAttendanceClient";

export const dynamic = "force-dynamic";

const THAI_MONTH_NAMES = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
];

function formatMonthThaiLabel(periodMonth: string): string {
    const [yStr, mStr] = periodMonth.split("-");
    const year = parseInt(yStr, 10);
    const monthIdx = parseInt(mStr, 10) - 1;
    if (Number.isNaN(year) || monthIdx < 0 || monthIdx > 11) return periodMonth;
    const buddhistYear = year + 543;
    return `${THAI_MONTH_NAMES[monthIdx]} ${buddhistYear}`;
}

export default async function EmployeeAttendancePage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const todayStr = await getBangkokDateString();
    const currentMonth = todayStr.slice(0, 7); // YYYY-MM (default to current month)

    const rows = await db.staffCheckIn.findMany({
        where: { staffId: session.staffId },
        orderBy: [{ date: "desc" }, { checkInAt: "desc" }],
    });

    const records: EmployeeAttendanceRecord[] = rows.map((row) => {
        const dateStr = row.date.toISOString().split("T")[0];
        return {
            id: row.id,
            dateStr,
            monthStr: dateStr.slice(0, 7),
            locationType: row.locationType,
            locationName: row.locationName,
            checkInAt: row.checkInAt.toISOString(),
            checkInDistanceKm: row.checkInDistanceKm,
            checkInPhotoUrl: row.checkInPhotoUrl,
            checkInNote: row.checkInNote,
            checkOutAt: row.checkOutAt ? row.checkOutAt.toISOString() : null,
            checkOutDistanceKm: row.checkOutDistanceKm,
            checkOutPhotoUrl: row.checkOutPhotoUrl,
            isForgotCheckOut: row.isForgotCheckOut,
            forgotCheckOutReason: row.forgotCheckOutReason,
            hoursWorked: row.hoursWorked ? Number(row.hoursWorked) : null,
            shiftStartTime: row.shiftStartTime,
            shiftEndTime: row.shiftEndTime,
            lateMinutes: row.lateMinutes,
            earlyLeaveMinutes: row.earlyLeaveMinutes,
        };
    });

    // Build month options: current month + past 11 months + any months from records
    const monthSet = new Set<string>();
    const [curYear, curMonthNum] = currentMonth.split("-").map(Number);
    for (let i = 0; i < 12; i++) {
        const d = new Date(curYear, curMonthNum - 1 - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthSet.add(ym);
    }
    for (const r of records) {
        monthSet.add(r.monthStr);
    }

    const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    const monthOptions = sortedMonths.map((ym) => ({
        value: ym,
        label: formatMonthThaiLabel(ym),
    }));

    return (
        <EmployeeAttendanceClient
            records={records}
            defaultMonth={currentMonth}
            monthOptions={monthOptions}
            staffName={session.name}
        />
    );
}

