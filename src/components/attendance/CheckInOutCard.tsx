"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Camera,
    MapPin,
    CheckCircle2,
    Clock,
    AlertTriangle,
    RefreshCw,
    X,
    SwitchCamera,
    LogIn,
    LogOut,
    Building2,
} from "lucide-react";
import { performCheckIn, performCheckOut } from "@/actions/attendance-actions";
import { calculateDistanceKm, formatDistanceThai } from "@/lib/geo";
import { useToast } from "@/components/ui/toast";

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
    radiusKm = 0.5,
    workStartTime,
    workEndTime,
    todayCheckIn,
}: CheckInOutCardProps) {
    const router = useRouter();
    const { toastSuccess, toastError } = useToast();
    const allowedRadius = radiusKm && radiusKm > 0 ? radiusKm : 0.5;
    const shiftStart = workStartTime || (isHeadOffice ? "09:00" : "10:00");
    const shiftEnd = workEndTime || (isHeadOffice ? "18:00" : "21:00");

    // Modal state: null | 'checkin' | 'checkout'
    const [activeModal, setActiveModal] = useState<"checkin" | "checkout" | null>(null);

    // GPS State
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

    // Camera State (Live WebRTC camera only — no file upload allowed)
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

    // Form fields
    const [note, setNote] = useState("");
    const [isForgotCheckOut, setIsForgotCheckOut] = useState(false);
    const [forgotReason, setForgotReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

    // Check if todayCheckIn belongs to THIS location
    const isThisLocationCheckIn = todayCheckIn
        ? isHeadOffice
            ? todayCheckIn.locationType === "HQ"
            : todayCheckIn.channelId === channelId
        : false;

    const isOtherLocationCheckIn = Boolean(todayCheckIn && !isThisLocationCheckIn);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(
        async (mode: "user" | "environment") => {
            stopCamera();
            setCameraError(null);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError("เบราว์เซอร์ไม่รองรับการเปิดกล้องสด กรุณาเปิดผ่าน Safari หรือ Chrome และอนุญาตการเข้าถึงกล้อง");
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: mode,
                        width: { ideal: 1280 },
                        height: { ideal: 960 },
                    },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
            } catch (err) {
                console.warn("getUserMedia error:", err);
                setCameraError("กรุณาอนุญาตการเข้าถึงกล้องถ่ายรูป (Camera Permission) ในเบราว์เซอร์ แล้วกดลองเปิดกล้องอีกครั้ง");
            }
        },
        [stopCamera]
    );

    const fetchGps = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError("อุปกรณ์นี้ไม่รองรับ GPS");
            return;
        }
        setGpsLoading(true);
        setGpsError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCurrentCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
                setGpsLoading(false);
            },
            (err) => {
                setGpsLoading(false);
                if (err.code === 1) {
                    setGpsError("กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location / GPS) ในเบราว์เซอร์เพื่อลงเวลา");
                } else {
                    setGpsError("ไม่สามารถดึงพิกัด GPS ได้ กรุณาเปิด Location แล้วกดรีเฟรชพิกัด");
                }
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    }, []);

    // Open / Close Modal lifecycle
    const openModal = (mode: "checkin" | "checkout") => {
        setActiveModal(mode);
        setCapturedBlob(null);
        setCapturedPreview(null);
        setNote("");
        setIsForgotCheckOut(false);
        setForgotReason("");
        fetchGps();
        setTimeout(() => {
            startCamera(facingMode);
        }, 100);
    };

    const closeModal = () => {
        stopCamera();
        if (capturedPreview) {
            URL.revokeObjectURL(capturedPreview);
        }
        setCapturedBlob(null);
        setCapturedPreview(null);
        setActiveModal(null);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleSwitchCamera = () => {
        const nextMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(nextMode);
        if (!capturedPreview) {
            startCamera(nextMode);
        }
    };

    // Capture frame from live video onto canvas and compress JPEG
    const handleCaptureFromVideo = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const maxDim = 1280;
        let width = video.videoWidth;
        let height = video.videoHeight;
        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);

        // Stamp timestamp & location bar at bottom of photo for auditability
        const nowStr = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(0, height - 52, width, 52);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`${locationName} • ${nowStr}`, 14, height - 28);
        if (currentCoords) {
            ctx.font = "13px monospace";
            ctx.fillText(
                `GPS: ${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}`,
                14,
                height - 10
            );
        }

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setCapturedBlob(blob);
                    setCapturedPreview(URL.createObjectURL(blob));
                    stopCamera();
                }
            },
            "image/jpeg",
            0.82
        );
    };

    const handleRetakePhoto = () => {
        if (capturedPreview) {
            URL.revokeObjectURL(capturedPreview);
        }
        setCapturedBlob(null);
        setCapturedPreview(null);
        startCamera(facingMode);
    };

    // Distance calculation
    const hasTargetCoords = targetLat !== null && targetLng !== null;
    const currentDistanceKm =
        hasTargetCoords && currentCoords
            ? calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetLat!, targetLng!)
            : null;
    const isOutOfRange = currentDistanceKm !== null && currentDistanceKm > allowedRadius;

    // Submit Check-in or Check-out
    const handleConfirm = async () => {
        if (!capturedBlob) {
            toastError("กรุณาถ่ายรูปก่อนกดยืนยัน");
            return;
        }
        if (!currentCoords) {
            toastError("ไม่พบพิกัด GPS กรุณากดรีเฟรชพิกัดก่อน");
            return;
        }
        if (activeModal === "checkin" && isOutOfRange) {
            toastError(
                `ไม่สามารถ Check-in ได้ เนื่องจากคุณอยู่ห่าง ${formatDistanceThai(currentDistanceKm!)} (เกินรัศมี ${allowedRadius} กม.)`
            );
            return;
        }
        if (activeModal === "checkout" && isOutOfRange && !isForgotCheckOut) {
            toastError('คุณอยู่นอกรัศมีหน้างาน กรุณาติ๊กเลือก "ลืม Check-out" เพื่อยืนยันการออกงานนอกพื้นที่');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload photo to R2
            const uploadForm = new FormData();
            uploadForm.append("file", capturedBlob, `${activeModal}-${Date.now()}.jpg`);
            uploadForm.append("type", activeModal || "checkin");

            const uploadRes = await fetch("/api/attendance/upload", {
                method: "POST",
                body: uploadForm,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData.url) {
                toastError(uploadData.error || "อัปโหลดรูปภาพไม่สำเร็จ");
                setSubmitting(false);
                return;
            }

            // 2. Call Server Action
            if (activeModal === "checkin") {
                const res = await performCheckIn({
                    channelId,
                    isHeadOffice,
                    lat: currentCoords.lat,
                    lng: currentCoords.lng,
                    photoUrl: uploadData.url,
                    note,
                });

                if (res.error) {
                    toastError(res.error);
                    setSubmitting(false);
                    return;
                }

                toastSuccess(`Check-in เข้างานที่ ${locationName} สำเร็จ!`);
                closeModal();
                router.refresh();
            } else if (activeModal === "checkout" && todayCheckIn) {
                const res = await performCheckOut({
                    checkInId: todayCheckIn.id,
                    lat: currentCoords.lat,
                    lng: currentCoords.lng,
                    photoUrl: uploadData.url,
                    isForgotCheckOut: isForgotCheckOut || isOutOfRange,
                    forgotCheckOutReason: forgotReason,
                });

                if (res.error) {
                    toastError(res.error);
                    setSubmitting(false);
                    return;
                }

                toastSuccess(`Check-out ออกงานสำเร็จ!`);
                closeModal();
                router.refresh();
            }
        } catch (err: any) {
            toastError(err.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
        } finally {
            setSubmitting(false);
        }
    };

    const formatThaiTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

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
                                {formatThaiTime(todayCheckIn.checkInAt)} น.)
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
                                onClick={() => openModal("checkin")}
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
                                    onClick={() => setPreviewModalUrl(todayCheckIn.checkInPhotoUrl)}
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
                                        {(todayCheckIn.lateMinutes ?? 0) > 0 ? (
                                            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                                สาย {todayCheckIn.lateMinutes} นาที
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                                ตรงเวลา
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                                        {formatThaiTime(todayCheckIn.checkInAt)} น.
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
                                            onClick={() => setPreviewModalUrl(todayCheckIn.checkOutPhotoUrl!)}
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
                                            {formatThaiTime(todayCheckIn.checkOutAt)} น.
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

                        {/* Check-out Button if not checked out yet */}
                        {!todayCheckIn.checkOutAt && (
                            <button
                                type="button"
                                onClick={() => openModal("checkout")}
                                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>ถ่ายรูป &amp; กด Check-out ออกงาน</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Camera + GPS Check-in / Check-out Modal */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 my-auto">
                        {/* Modal Header */}
                        <div
                            className={`px-5 py-4 text-white flex items-center justify-between ${
                                activeModal === "checkin"
                                    ? "bg-gradient-to-r from-teal-600 to-emerald-600"
                                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                            }`}
                        >
                            <div>
                                <h3 className="font-bold text-base">
                                    {activeModal === "checkin"
                                        ? "📷 ถ่ายรูปเพื่อ Check-in เข้างาน"
                                        : "📷 ถ่ายรูปเพื่อ Check-out ออกงาน"}
                                </h3>
                                <p className="text-xs text-white/85 mt-0.5">{locationName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
                            {/* Step 1: Live GPS Status Banner */}
                            <div
                                className={`rounded-xl p-3.5 border text-xs ${
                                    gpsLoading
                                        ? "bg-slate-50 border-slate-200 text-slate-600"
                                        : gpsError
                                        ? "bg-red-50 border-red-200 text-red-700"
                                        : isOutOfRange
                                        ? "bg-amber-50 border-amber-300 text-amber-900"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div>
                                            {gpsLoading && (
                                                <p className="font-semibold">กำลังตรวจสอบพิกัด GPS ปัจจุบัน...</p>
                                            )}
                                            {!gpsLoading && gpsError && (
                                                <p className="font-semibold">{gpsError}</p>
                                            )}
                                            {!gpsLoading && !gpsError && currentCoords && (
                                                <>
                                                    <p className="font-bold">
                                                        {isOutOfRange
                                                            ? `🔴 อยู่นอกรัศมีหน้างาน (${formatDistanceThai(currentDistanceKm!)})`
                                                            : `🟢 อยู่ในรัศมีที่กำหนด (ห่างจุดเช็คอิน ${formatDistanceThai(currentDistanceKm || 0)})`}
                                                    </p>
                                                    <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                                                        พิกัดของคุณ: {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)} (กำหนดไม่เกิน {allowedRadius} กม.)
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchGps}
                                        disabled={gpsLoading}
                                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium inline-flex items-center gap-1 shrink-0 shadow-2xs"
                                    >
                                        <RefreshCw className={`h-3 w-3 ${gpsLoading ? "animate-spin" : ""}`} />
                                        รีเฟรช
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Live Camera or Captured Preview */}
                            <div className="space-y-2">
                                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[4/3] flex items-center justify-center">
                                    {capturedPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={capturedPreview}
                                            alt="Captured preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : cameraError ? (
                                        <div className="p-6 text-center text-white space-y-3">
                                            <Camera className="h-10 w-10 text-slate-400 mx-auto" />
                                            <p className="text-xs text-slate-300">{cameraError}</p>
                                            <button
                                                type="button"
                                                onClick={() => startCamera(facingMode)}
                                                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-2"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                                ลองเปิดกล้องอีกครั้ง
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <video
                                                ref={videoRef}
                                                playsInline
                                                muted
                                                autoPlay
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSwitchCamera}
                                                className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                                title="สลับกล้องหน้า-หลัง"
                                            >
                                                <SwitchCamera className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {/* Capture / Retake buttons */}
                                {!capturedPreview ? (
                                    !cameraError && (
                                        <button
                                            type="button"
                                            onClick={handleCaptureFromVideo}
                                            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Camera className="h-4 w-4" />
                                            กดถ่ายภาพสด
                                        </button>
                                    )
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleRetakePhoto}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        ถ่ายใหม่
                                    </button>
                                )}
                            </div>

                            {/* Step 3: Out-of-range block for Check-in OR Forgot Check-out option for Check-out */}
                            {activeModal === "checkin" && isOutOfRange && (
                                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">ไม่สามารถกด Check-in นอกพื้นที่ได้</p>
                                        <p className="mt-0.5">
                                            กรุณาเดินทางเข้าใกล้จุดเช็คอินให้ไม่เกิน {allowedRadius} กม. แล้วกด &quot;รีเฟรช&quot; พิกัดอีกครั้ง
                                        </p>
                                    </div>
                                </div>
                            )}

                            {activeModal === "checkin" && !isOutOfRange && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        หมายเหตุเข้างาน (ถ้ามี)
                                    </label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="เช่น เข้ากะเช้า"
                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                    />
                                </div>
                            )}

                            {activeModal === "checkout" && (
                                <div className="space-y-3">
                                    <label
                                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                            isOutOfRange
                                                ? "border-amber-300 bg-amber-50/70"
                                                : "border-slate-200 bg-slate-50/60"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isForgotCheckOut}
                                            onChange={(e) => setIsForgotCheckOut(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                        />
                                        <div className="text-xs">
                                            <span className="font-bold text-slate-900">
                                                ☑️ ลืม Check-out จากหน้างาน (ยืนยันการ Check-out นอกพื้นที่)
                                            </span>
                                            <span className="block text-slate-500 mt-0.5">
                                                {isOutOfRange
                                                    ? "คุณอยู่นอกรัศมีหน้างาน กรุณาติ๊กช่องนี้เพื่อยืนยันว่าลืมกดออกงานตอนอยู่หน้างาน"
                                                    : "ติ๊กเฉพาะกรณีที่คุณออกนอกสถานที่ไปแล้วและลืมกด Check-out ตอนเลิกงาน"}
                                            </span>
                                        </div>
                                    </label>

                                    {(isForgotCheckOut || isOutOfRange) && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                                หมายเหตุ / เวลาเลิกงานจริง (แจ้ง HR)
                                            </label>
                                            <input
                                                type="text"
                                                value={forgotReason}
                                                onChange={(e) => setForgotReason(e.target.value)}
                                                placeholder="เช่น เลิกงานจริง 21:00 น. แต่ลืมกดตอนอยู่หน้างาน"
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Confirm Button */}
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={
                                    submitting ||
                                    !capturedBlob ||
                                    !currentCoords ||
                                    (activeModal === "checkin" && isOutOfRange) ||
                                    (activeModal === "checkout" && isOutOfRange && !isForgotCheckOut)
                                }
                                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 ${
                                    activeModal === "checkin"
                                        ? "bg-teal-600 hover:bg-teal-700"
                                        : "bg-amber-600 hover:bg-amber-700"
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span>กำลังบันทึกข้อมูล...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>
                                            {activeModal === "checkin"
                                                ? "ยืนยัน Check-in เข้างาน"
                                                : "ยืนยัน Check-out ออกงาน"}
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Preview Modal */}
            {previewModalUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewModalUrl(null)}
                >
                    <div className="relative max-w-lg w-full">
                        <button
                            type="button"
                            onClick={() => setPreviewModalUrl(null)}
                            className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewModalUrl}
                            alt="Attendance photo"
                            className="w-full rounded-2xl shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </>
    );
}

