"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    LogIn,
    LogOut,
    Building2,
} from "lucide-react";
import { formatDistanceThai } from "@/lib/geo";
import {
    DEFAULT_CHECK_IN_RADIUS_KM,
    LOCATION_TYPES,
    resolveCheckInRadius,
    resolveShiftTimes,
    formatBangkokTime,
    type SerializedCheckIn,
} from "@/config/attendance";
import { CheckInTimingBadge } from "./AttendanceBadges";
import { PhotoLightboxModal, type PhotoLightboxData } from "./PhotoLightboxModal";
import { LiveCameraCaptureModal } from "./LiveCameraCaptureModal";

export type { SerializedCheckIn };

interface CheckInOutCardProps {
    channelId?: string | null;
    isHeadOffice?: boolean;
    locationName: string;
    targetLat: number | null;
    targetLng: number | null;
    radiusKm?: number | null;
    workStartTime?: string | null;
    workEndTime?: string | null;
    todayCheckIn: SerializedCheckIn | null;
}

export function CheckInOutCard({
    channelId = null,
    isHeadOffice = false,
    locationName,
    targetLat,
    targetLng,
    radiusKm = DEFAULT_CHECK_IN_RADIUS_KM,
    workStartTime,
    workEndTime,
    todayCheckIn,
}: CheckInOutCardProps) {
    const router = useRouter();
    const allowedRadius = resolveCheckInRadius(radiusKm);
    const { shiftStart, shiftEnd } = resolveShiftTimes({
        isHeadOffice,
        workStartTime,
        workEndTime,
    });

    const [activeModal, setActiveModal] = useState<"checkin" | "checkout" | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<PhotoLightboxData | null>(null);

    const isThisLocationCheckIn = todayCheckIn
        ? isHeadOffice
            ? todayCheckIn.locationType === LOCATION_TYPES.HQ
            : todayCheckIn.channelId === channelId
        : false;

    const isOtherLocationCheckIn = Boolean(todayCheckIn && !isThisLocationCheckIn);
    const hasTargetCoords = targetLat !== null && targetLng !== null;

    return (
        <>
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                                isHeadOffice
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "bg-teal-50 text-teal-600"
                            }`}
                        >
                            {isHeadOffice ? (
                                <Building2 className="h-5 w-5" />
                            ) : (
                                <Clock className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                ลงเวลาเข้า-ออกงาน (Check-in / Check-out)
                            </h3>
                            <p className="text-xs text-slate-500">
                                {locationName} • กะ {shiftStart}–{shiftEnd} น. • รัศมีไม่เกิน {allowedRadius} กม.
                            </p>
                        </div>
                    </div>

                    {isThisLocationCheckIn && todayCheckIn?.checkOutAt && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> ครบแล้ววันนี้
                        </span>
                    )}
                    {isThisLocationCheckIn && !todayCheckIn?.checkOutAt && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                            กำลังปฏิบัติงาน
                        </span>
                    )}
                </div>

                {/* Case 1: Checked in at ANOTHER location today */}
                {isOtherLocationCheckIn && todayCheckIn && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">
                                วันนี้คุณได้ลงเวลาเข้างานที่ &quot;{todayCheckIn.locationName}&quot; ไปแล้ว
                            </p>
                            <p className="text-amber-700 mt-0.5">
                                ระบบกำหนดให้ Check-in ได้ 1 คน ต่อ 1 สถานที่ ต่อวัน (เข้างานเวลา{" "}
                                {formatBangkokTime(todayCheckIn.checkInAt)} น.)
                            </p>
                        </div>
                    </div>
                )}

                {/* Case 2: Not checked in yet today */}
                {!todayCheckIn && (
                    <>
                        {!hasTargetCoords ? (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">ยังไม่ได้ตั้งค่าพิกัด GPS สำหรับสถานที่นี้</p>
                                    <p className="text-amber-700 mt-0.5">
                                        กรุณาแจ้งผู้ดูแลระบบให้ระบุพิกัด GPS ก่อนจึงจะสามารถกด Check-in ได้
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setActiveModal("checkin")}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                            >
                                <LogIn className="h-4 w-4" />
                                <span>ถ่ายรูป &amp; กด Check-in เข้างาน</span>
                            </button>
                        )}
                    </>
                )}

                {/* Case 3 & 4: Checked in at THIS location today */}
                {isThisLocationCheckIn && todayCheckIn && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
                            {/* Check-in info */}
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPreviewPhoto({
                                            url: todayCheckIn.checkInPhotoUrl,
                                            title: "รูปถ่ายเข้างาน (Check-in)",
                                            subtitle: `${locationName} • เวลา ${formatBangkokTime(todayCheckIn.checkInAt)} น.`,
                                        })
                                    }
                                    className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-200 relative group"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={todayCheckIn.checkInPhotoUrl}
                                        alt="Check-in"
                                        className="h-full w-full object-cover"
                                    />
                                </button>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                            เข้างาน
                                        </span>
                                        <CheckInTimingBadge lateMinutes={todayCheckIn.lateMinutes} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                                        {formatBangkokTime(todayCheckIn.checkInAt)} น.
                                    </p>
                                    {todayCheckIn.checkInDistanceKm !== null && (
                                        <p className="text-[11px] text-slate-400 truncate">
                                            ห่าง {formatDistanceThai(todayCheckIn.checkInDistanceKm)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Check-out info */}
                            {todayCheckIn.checkOutAt ? (
                                <div className="flex items-center gap-2.5 border-l border-slate-200 pl-2.5">
                                    {todayCheckIn.checkOutPhotoUrl && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPreviewPhoto({
                                                    url: todayCheckIn.checkOutPhotoUrl!,
                                                    title: "รูปถ่ายออกงาน (Check-out)",
                                                    subtitle: `${locationName} • เวลา ${formatBangkokTime(todayCheckIn.checkOutAt!)} น.`,
                                                })
                                            }
                                            className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-200"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={todayCheckIn.checkOutPhotoUrl}
                                                alt="Check-out"
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    )}
                                    <div className="min-w-0">
                                        <span
                                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                                                todayCheckIn.isForgotCheckOut
                                                    ? "text-amber-700 bg-amber-50"
                                                    : "text-blue-700 bg-blue-50"
                                            }`}
                                        >
                                            {todayCheckIn.isForgotCheckOut
                                                ? "ออกงาน (ลืม Check-out)"
                                                : "ออกงาน (Check-out)"}
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                                            {formatBangkokTime(todayCheckIn.checkOutAt)} น.
                                        </p>
                                        {todayCheckIn.hoursWorked !== null && (
                                            <p className="text-[11px] text-slate-500">
                                                รวม {todayCheckIn.hoursWorked} ชม.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col justify-center border-l border-slate-200 pl-2.5">
                                    <span className="text-xs text-slate-400">เวลาออกงาน</span>
                                    <span className="text-xs font-medium text-amber-600 mt-0.5">
                                        ยังไม่ได้ Check-out
                                    </span>
                                </div>
                            )}
                        </div>

                        {!todayCheckIn.checkOutAt && (
                            <button
                                type="button"
                                onClick={() => setActiveModal("checkout")}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>ถ่ายรูป &amp; กด Check-out ออกงาน</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {activeModal && (
                <LiveCameraCaptureModal
                    mode={activeModal}
                    channelId={channelId}
                    isHeadOffice={isHeadOffice}
                    locationName={locationName}
                    targetLat={targetLat}
                    targetLng={targetLng}
                    allowedRadius={allowedRadius}
                    todayCheckIn={todayCheckIn}
                    onClose={() => setActiveModal(null)}
                    onSuccess={() => router.refresh()}
                />
            )}

            <PhotoLightboxModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
        </>
    );
}
