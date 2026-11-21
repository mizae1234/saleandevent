"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Camera,
    MapPin,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    X,
    SwitchCamera,
} from "lucide-react";
import { performCheckIn, performCheckOut } from "@/actions/attendance-actions";
import { calculateDistanceKm, formatDistanceThai } from "@/lib/geo";
import { ATTENDANCE_TIMEZONE, type SerializedCheckIn } from "@/config/attendance";
import { useToast } from "@/components/ui/toast";

interface LiveCameraCaptureModalProps {
    mode: "checkin" | "checkout";
    channelId: string | null;
    isHeadOffice: boolean;
    locationName: string;
    targetLat: number | null;
    targetLng: number | null;
    allowedRadius: number;
    todayCheckIn: SerializedCheckIn | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function LiveCameraCaptureModal({
    mode,
    channelId,
    isHeadOffice,
    locationName,
    targetLat,
    targetLng,
    allowedRadius,
    todayCheckIn,
    onClose,
    onSuccess,
}: LiveCameraCaptureModalProps) {
    const { toastSuccess, toastError } = useToast();

    // GPS State
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

    // Camera State (100% live WebRTC camera stream — no file upload allowed)
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

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(
        async (cameraMode: "user" | "environment") => {
            stopCamera();
            setCameraError(null);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraError(
                    "เบราว์เซอร์ไม่รองรับการเปิดกล้องสด กรุณาเปิดผ่าน Safari หรือ Chrome และอนุญาตการเข้าถึงกล้อง"
                );
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: cameraMode,
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
                setCameraError(
                    "กรุณาอนุญาตการเข้าถึงกล้องถ่ายรูป (Camera Permission) ในเบราว์เซอร์ แล้วกดลองเปิดกล้องอีกครั้ง"
                );
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

    useEffect(() => {
        fetchGps();
        const timer = setTimeout(() => {
            startCamera("user");
        }, 100);
        return () => {
            clearTimeout(timer);
            stopCamera();
        };
    }, [fetchGps, startCamera, stopCamera]);

    const handleClose = () => {
        stopCamera();
        if (capturedPreview) {
            URL.revokeObjectURL(capturedPreview);
        }
        onClose();
    };

    const handleSwitchCamera = () => {
        const nextMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(nextMode);
        if (!capturedPreview) {
            startCamera(nextMode);
        }
    };

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
        const nowStr = new Date().toLocaleString("th-TH", { timeZone: ATTENDANCE_TIMEZONE });
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

    const hasTargetCoords = targetLat !== null && targetLng !== null;
    const currentDistanceKm =
        hasTargetCoords && currentCoords
            ? calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetLat!, targetLng!)
            : null;
    const isOutOfRange = currentDistanceKm !== null && currentDistanceKm > allowedRadius;

    const handleConfirm = async () => {
        if (!capturedBlob) {
            toastError("กรุณาถ่ายรูปก่อนกดยืนยัน");
            return;
        }
        if (!currentCoords) {
            toastError("ไม่พบพิกัด GPS กรุณากดรีเฟรชพิกัดก่อน");
            return;
        }
        if (mode === "checkin" && isOutOfRange) {
            toastError(
                `ไม่สามารถ Check-in ได้ เนื่องจากคุณอยู่ห่าง ${formatDistanceThai(currentDistanceKm!)} (เกินรัศมี ${allowedRadius} กม.)`
            );
            return;
        }
        if (mode === "checkout" && isOutOfRange && !isForgotCheckOut) {
            toastError('คุณอยู่นอกรัศมีหน้างาน กรุณาติ๊กเลือก "ลืม Check-out" เพื่อยืนยันการออกงานนอกพื้นที่');
            return;
        }

        setSubmitting(true);
        try {
            const uploadForm = new FormData();
            uploadForm.append("file", capturedBlob, `${mode}-${Date.now()}.jpg`);
            uploadForm.append("type", mode);

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

            if (mode === "checkin") {
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
                handleClose();
                onSuccess();
            } else if (mode === "checkout" && todayCheckIn) {
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

                toastSuccess("Check-out ออกงานสำเร็จ!");
                handleClose();
                onSuccess();
            }
        } catch (err: any) {
            toastError(err.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 my-auto">
                {/* Modal Header */}
                <div
                    className={`px-5 py-4 text-white flex items-center justify-between ${
                        mode === "checkin"
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600"
                            : "bg-gradient-to-r from-amber-500 to-orange-600"
                    }`}
                >
                    <div>
                        <h3 className="font-bold text-base">
                            {mode === "checkin"
                                ? "📷 ถ่ายรูปเพื่อ Check-in เข้างาน"
                                : "📷 ถ่ายรูปเพื่อ Check-out ออกงาน"}
                        </h3>
                        <p className="text-xs text-white/85 mt-0.5">{locationName}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
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
                                                พิกัดของคุณ: {currentCoords.lat.toFixed(6)},{" "}
                                                {currentCoords.lng.toFixed(6)} (กำหนดไม่เกิน {allowedRadius} กม.)
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
                    {mode === "checkin" && isOutOfRange && (
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

                    {mode === "checkin" && !isOutOfRange && (
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

                    {mode === "checkout" && (
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
                            (mode === "checkin" && isOutOfRange) ||
                            (mode === "checkout" && isOutOfRange && !isForgotCheckOut)
                        }
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 ${
                            mode === "checkin"
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
                                    {mode === "checkin"
                                        ? "ยืนยัน Check-in เข้างาน"
                                        : "ยืนยัน Check-out ออกงาน"}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
