import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ShoppingCart, Wallet, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CheckInOutCard, type SerializedCheckIn } from "@/components/attendance/CheckInOutCard";
import { getBangkokDateString } from "@/actions/attendance-actions";

async function validateChannelAccess(channelId: string, staffId: string) {
    const assignment = await db.channelStaff.findFirst({
        where: { channelId, staffId },
        include: { channel: true }
    });
    return assignment;
}

export default async function ChannelWorkModePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    // Admin can access any channel
    const isAdmin = ['ADMIN', 'MANAGER'].includes(session.role);
    let channel;

    if (isAdmin) {
        channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    } else {
        const assignment = await validateChannelAccess(channelId, session.staffId);
        if (!assignment) notFound();
        channel = assignment.channel;
    }

    if (!channel || !channel.isActive) notFound();

    // Load today's check-in record for this staff member
    const todayStr = await getBangkokDateString();
    const todayDate = new Date(`${todayStr}T00:00:00.000Z`);
    const todayCheckInRow = await db.staffCheckIn.findUnique({
        where: {
            staffId_date: {
                staffId: session.staffId,
                date: todayDate,
            },
        },
    });

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

    const WORK_MODES = [
        {
            title: "เข้า POS",
            subtitle: "บันทึกการขายสินค้า",
            icon: ShoppingCart,
            href: `/channel/${channelId}/pos`,
            color: "from-emerald-500 to-emerald-600",
            shadowColor: "shadow-emerald-200/50",
        },
        {
            title: "เงินเดือน / คอมฯ / เบิกค่าใช้จ่าย",
            subtitle: channel.type === 'BRANCH'
                ? "เบิกเงินเดือนประจำ / ค่าแรง / คอมมิชชั่น / ค่าใช้จ่ายรายเดือน (รอบจ่ายวันที่ 30)"
                : "ดูวันทำงาน, เบิกค่าแรงและค่าใช้จ่าย",
            icon: Wallet,
            href: `/channel/${channelId}/payroll`,
            color: "from-blue-500 to-blue-600",
            shadowColor: "shadow-blue-200/50",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Channel Info */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{channel.code}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                        ${channel.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {channel.status}
                    </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{channel.name}</h2>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                    <MapPin className="h-4 w-4" />
                    {channel.location}
                </div>
            </div>

            {/* Check-in / Check-out Card */}
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

            {/* Work Mode Cards */}
            <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">เลือกโหมดทำงาน</h3>
                <div className="space-y-3">
                    {WORK_MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <Link
                                key={mode.href}
                                href={mode.href}
                                className="block rounded-2xl bg-white p-5 shadow-sm hover:shadow-md border border-slate-100 active:scale-[0.98] transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${mode.color} ${mode.shadowColor} shadow-lg flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-900 text-lg">{mode.title}</h4>
                                        <p className="text-sm text-slate-500">{mode.subtitle}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-300" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
