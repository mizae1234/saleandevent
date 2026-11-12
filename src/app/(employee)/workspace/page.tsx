import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MapPin, Calendar, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { getCompanySetting } from "@/actions/company-setting-actions";
import { getBangkokDateString } from "@/actions/attendance-actions";
import { CheckInOutCard, type SerializedCheckIn } from "@/components/attendance/CheckInOutCard";

async function getAssignedChannels(staffId: string) {
    const assignments = await db.channelStaff.findMany({
        where: { staffId },
        include: {
            channel: {
                include: {
                    stock: {
                        select: { quantity: true, soldQuantity: true },
                    },
                },
            },
        },
        orderBy: { channel: { startDate: "desc" } },
    });

    return assignments
        .filter(
            (a) =>
                a.channel.isActive !== false &&
                [
                    "active",
                    "approved",
                    "pending_payment",
                    "payment_approved",
                    "received",
                    "shipped",
                    "packing",
                    "pending_return",
                    "returning",
                    "returned",
                ].includes(a.channel.status)
        )
        .map((a) => a.channel);
}

export default async function WorkspacePage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const todayStr = await getBangkokDateString();
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);

    const [channels, staff, companySetting, todayCheckInRow] = await Promise.all([
        getAssignedChannels(session.staffId),
        db.staff.findUnique({
            where: { id: session.staffId },
            select: { isHeadOffice: true, role: true },
        }),
        getCompanySetting(),
        db.staffCheckIn.findUnique({
            where: {
                staffId_date: {
                    staffId: session.staffId,
                    date: todayDate,
                },
            },
        }),
    ]);

    const serializedCheckIn: SerializedCheckIn | null = todayCheckInRow
        ? {
              id: todayCheckInRow.id,
              channelId: todayCheckInRow.channelId,
              locationType: todayCheckInRow.locationType,
              locationName: todayCheckInRow.locationName,
              checkInAt: todayCheckInRow.checkInAt.toISOString(),
              checkInLat: todayCheckInRow.checkInLat,
              checkInLng: todayCheckInRow.checkInLng,
              checkInDistanceKm: todayCheckInRow.checkInDistanceKm,
              checkInPhotoUrl: todayCheckInRow.checkInPhotoUrl,
              checkInNote: todayCheckInRow.checkInNote,
              checkOutAt: todayCheckInRow.checkOutAt ? todayCheckInRow.checkOutAt.toISOString() : null,
              checkOutLat: todayCheckInRow.checkOutLat,
              checkOutLng: todayCheckInRow.checkOutLng,
              checkOutDistanceKm: todayCheckInRow.checkOutDistanceKm,
              checkOutPhotoUrl: todayCheckInRow.checkOutPhotoUrl,
              isForgotCheckOut: todayCheckInRow.isForgotCheckOut,
              forgotCheckOutReason: todayCheckInRow.forgotCheckOutReason,
              hoursWorked: todayCheckInRow.hoursWorked ? Number(todayCheckInRow.hoursWorked) : null,
              shiftStartTime: todayCheckInRow.shiftStartTime,
              shiftEndTime: todayCheckInRow.shiftEndTime,
              lateMinutes: todayCheckInRow.lateMinutes,
              earlyLeaveMinutes: todayCheckInRow.earlyLeaveMinutes,
          }
        : null;

    // Show Head Office check-in card only if staff.isHeadOffice is true (or already checked in at HQ today)
    const showHeadOfficeCard = Boolean(
        staff?.isHeadOffice || todayCheckInRow?.locationType === "HQ"
    );

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    สวัสดี, {session.name} 👋
                </h1>
                <p className="text-slate-500 mt-1">
                    ลงเวลาเข้า-ออกงาน และเลือกช่องทางที่ต้องการทำงาน
                </p>
            </div>

            {/* Head Office Check-in / Check-out Card */}
            {showHeadOfficeCard && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        <Building2 className="h-4 w-4" />
                        <span>สำหรับพนักงานประจำสำนักงานใหญ่</span>
                    </div>
                    <CheckInOutCard
                        isHeadOffice={true}
                        locationName={companySetting.branchName || "สำนักงานใหญ่"}
                        targetLat={companySetting.latitude}
                        targetLng={companySetting.longitude}
                        radiusKm={companySetting.checkInRadiusKm ?? 0.5}
                        workStartTime={companySetting.workStartTime || "09:00"}
                        workEndTime={companySetting.workEndTime || "18:00"}
                        todayCheckIn={serializedCheckIn}
                    />
                </div>
            )}

            {/* Channel Cards */}
            {channels.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Event / สาขาที่ได้รับมอบหมาย ({channels.length})
                    </h2>
                    {channels.map((channel) => {
                        const totalStock = channel.stock.reduce((sum, s) => sum + s.quantity, 0);
                        const totalSold = channel.stock.reduce(
                            (sum, s) => sum + (s.soldQuantity || 0),
                            0
                        );

                        return (
                            <div
                                key={channel.id}
                                className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4"
                            >
                                <Link
                                    href={`/channel/${channel.id}`}
                                    className="block hover:opacity-90 transition-opacity"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 text-lg">
                                                {channel.name}
                                            </h3>
                                            <span className="text-xs font-mono text-slate-400">
                                                {channel.code}
                                            </span>
                                        </div>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                                            เข้าหน้าทำงาน →
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-sm text-slate-500 mb-3">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                            <span>{channel.location}</span>
                                        </div>
                                        {channel.startDate && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>
                                                    {format(new Date(channel.startDate), "d MMM")}
                                                    {channel.endDate &&
                                                        ` — ${format(new Date(channel.endDate), "d MMM")}`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stock mini bar */}
                                    {totalStock > 0 && (
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-500">ขายแล้ว</span>
                                                <span className="font-medium text-slate-700">
                                                    {totalSold} / {totalStock}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-teal-500 rounded-full"
                                                    style={{
                                                        width: `${(totalSold / totalStock) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Link>

                                {/* Direct Check-in / Check-out inside the assigned channel card */}
                                <div className="pt-2 border-t border-slate-100">
                                    <CheckInOutCard
                                        channelId={channel.id}
                                        locationName={`${channel.name} (${channel.code})`}
                                        targetLat={channel.latitude}
                                        targetLng={channel.longitude}
                                        radiusKm={channel.checkInRadiusKm ?? 0.5}
                                        workStartTime={channel.workStartTime || "10:00"}
                                        workEndTime={channel.workEndTime || "21:00"}
                                        todayCheckIn={serializedCheckIn}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State (Only if neither HQ nor Channels are assigned) */}
            {channels.length === 0 && !showHeadOfficeCard && (
                <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100">
                    <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-1">
                        ยังไม่มีช่องทางที่ถูกมอบหมาย
                    </h3>
                    <p className="text-sm text-slate-500">
                        กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มคุณเข้า Event / สาขา หรือกำหนดเป็นพนักงานสำนักงานใหญ่
                    </p>
                </div>
            )}
        </div>
    );
}
