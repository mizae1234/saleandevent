"use client";

import { useState } from "react";
import { MapPin, Navigation, ExternalLink, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { parseGoogleMapsCoords, isValidLatLng } from "@/lib/geo";

interface GpsCoordinatePickerProps {
    latitude: string;
    longitude: string;
    checkInRadiusKm: string;
    workStartTime?: string;
    workEndTime?: string;
    onChange: (values: {
        latitude: string;
        longitude: string;
        checkInRadiusKm: string;
        workStartTime?: string;
        workEndTime?: string;
    }) => void;
    required?: boolean;
    title?: string;
    subtitle?: string;
    compact?: boolean;
    showShiftTime?: boolean;
}

const RADIUS_PRESETS = [
    { label: "100 ม. (0.1 กม.)", value: "0.1" },
    { label: "200 ม. (0.2 กม.)", value: "0.2" },
    { label: "500 ม. (0.5 กม.)", value: "0.5" },
    { label: "1 กม.", value: "1" },
    { label: "2 กม.", value: "2" },
];

const SHIFT_PRESETS = [
    { label: "09:00 – 18:00 (สำนักงานใหญ่)", start: "09:00", end: "18:00" },
    { label: "10:00 – 21:00 (ห้าง/Event)", start: "10:00", end: "21:00" },
    { label: "10:00 – 22:00 (ห้างปิดดึก)", start: "10:00", end: "22:00" },
    { label: "08:00 – 20:00", start: "08:00", end: "20:00" },
];

export function GpsCoordinatePicker({
    latitude,
    longitude,
    checkInRadiusKm,
    workStartTime = "10:00",
    workEndTime = "21:00",
    onChange,
    required = false,
    title = "พิกัด GPS และเวลาเข้า-ออกงาน (Check-in / Check-out)",
    subtitle = "วางลิงก์ Google Maps, กรอกพิกัด Latitude/Longitude หรือกดดึงตำแหน่งปัจจุบัน",
    compact = false,
    showShiftTime = true,
}: GpsCoordinatePickerProps) {
    const [mapsInput, setMapsInput] = useState("");
    const [parseStatus, setParseStatus] = useState<{
        type: "success" | "error" | "loading";
        message: string;
    } | null>(null);
    const [locating, setLocating] = useState(false);

    const emitChange = (partial: {
        latitude?: string;
        longitude?: string;
        checkInRadiusKm?: string;
        workStartTime?: string;
        workEndTime?: string;
    }) => {
        onChange({
            latitude: partial.latitude ?? latitude,
            longitude: partial.longitude ?? longitude,
            checkInRadiusKm: partial.checkInRadiusKm ?? (checkInRadiusKm || "0.5"),
            workStartTime: partial.workStartTime ?? workStartTime,
            workEndTime: partial.workEndTime ?? workEndTime,
        });
    };

    const handleParseInput = async (val: string) => {
        setMapsInput(val);
        if (!val.trim()) {
            setParseStatus(null);
            return;
        }
        const parsed = parseGoogleMapsCoords(val);
        if (parsed) {
            emitChange({
                latitude: parsed.lat.toFixed(6),
                longitude: parsed.lng.toFixed(6),
            });
            setParseStatus({
                type: "success",
                message: `ดึงพิกัดสำเร็จ: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`,
            });
            return;
        }

        if (/https?:\/\/[^\s]+/i.test(val)) {
            setParseStatus({
                type: "loading",
                message: "กำลังคลี่ลิงก์ Google Maps เพื่อดึงพิกัดอัตโนมัติ...",
            });
            try {
                const res = await fetch("/api/geo/resolve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: val }),
                });
                const data = await res.json();
                if (res.ok && typeof data.lat === "number" && typeof data.lng === "number") {
                    emitChange({
                        latitude: data.lat.toFixed(6),
                        longitude: data.lng.toFixed(6),
                    });
                    setParseStatus({
                        type: "success",
                        message: `ดึงพิกัดจากลิงก์สำเร็จ: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`,
                    });
                } else {
                    setParseStatus({
                        type: "error",
                        message:
                            data.error ||
                            "ไม่พบพิกัดในลิงก์ กรุณาคลิกขวาบน Google Maps เพื่อคัดลอกตัวเลขพิกัด เช่น 13.7563, 100.5018",
                    });
                }
            } catch {
                setParseStatus({
                    type: "error",
                    message:
                        "ไม่สามารถดึงพิกัดจากลิงก์สั้นได้ กรุณาคัดลอกตัวเลขพิกัด เช่น 13.7563, 100.5018 มาวาง",
                });
            }
            return;
        }

        setParseStatus({
            type: "error",
            message:
                "ไม่พบพิกัดในข้อความ กรุณาวางลิงก์ Google Maps หรือพิมพ์พิกัด เช่น 13.7563, 100.5018",
        });
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            setParseStatus({
                type: "error",
                message: "เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS",
            });
            return;
        }
        setLocating(true);
        setParseStatus(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                emitChange({
                    latitude: lat,
                    longitude: lng,
                });
                setParseStatus({
                    type: "success",
                    message: `ดึงตำแหน่งปัจจุบันสำเร็จ (${lat}, ${lng})`,
                });
                setLocating(false);
            },
            (err) => {
                setLocating(false);
                setParseStatus({
                    type: "error",
                    message:
                        err.code === 1
                            ? "กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location Permission) ในเบราว์เซอร์"
                            : "ไม่สามารถดึงพิกัดปัจจุบันได้ กรุณากรอกพิกัดหรือวางลิงก์ Google Maps",
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasValidCoords =
        latitude.trim() !== "" &&
        longitude.trim() !== "" &&
        isValidLatLng(latNum, lngNum);

    return (
        <div
            className={`rounded-xl border border-teal-200/80 bg-teal-50/40 ${
                compact ? "p-4" : "p-5"
            } space-y-4`}
        >
            <input type="hidden" name="latitude" value={latitude} />
            <input type="hidden" name="longitude" value={longitude} />
            <input type="hidden" name="checkInRadiusKm" value={checkInRadiusKm || "0.5"} />
            <input type="hidden" name="workStartTime" value={workStartTime} />
            <input type="hidden" name="workEndTime" value={workEndTime} />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-teal-600" />
                        {title}
                        {required && <span className="text-red-500">*</span>}
                    </h4>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm shrink-0"
                >
                    <Navigation className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
                    {locating ? "กำลังดึงพิกัด..." : "ใช้พิกัดปัจจุบันของฉัน"}
                </button>
            </div>

            {/* Quick Paste Google Maps URL or Coords */}
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                    วางลิงก์ Google Maps หรือพิกัด (เช่น 13.7563, 100.5018) เพื่อดึงค่าอัตโนมัติ
                </label>
                <div className="relative">
                    <Sparkles className="h-4 w-4 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={mapsInput}
                        onChange={(e) => handleParseInput(e.target.value)}
                        placeholder="วางลิงก์ Google Maps (รองรับทั้งลิงก์สั้น maps.app.goo.gl และลิงก์ยาว) หรือพิมพ์ 13.7563, 100.5018"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>
                {parseStatus && (
                    <div
                        className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                            parseStatus.type === "success"
                                ? "text-emerald-700"
                                : parseStatus.type === "loading"
                                ? "text-teal-700"
                                : "text-amber-700"
                        }`}
                    >
                        {parseStatus.type === "success" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        ) : parseStatus.type === "loading" ? (
                            <Navigation className="h-3.5 w-3.5 shrink-0 text-teal-600 animate-spin" />
                        ) : (
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <span>{parseStatus.message}</span>
                    </div>
                )}
            </div>

            {/* Lat / Lng / Radius Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Latitude (ละติจูด) {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        step="any"
                        required={required}
                        value={latitude}
                        onChange={(e) => emitChange({ latitude: e.target.value })}
                        placeholder="เช่น 13.756331"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        Longitude (ลองจิจูด) {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        step="any"
                        required={required}
                        value={longitude}
                        onChange={(e) => emitChange({ longitude: e.target.value })}
                        placeholder="เช่น 100.501765"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                        รัศมีที่อนุญาตให้ Check-in (กม.) {required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="50"
                        required={required}
                        value={checkInRadiusKm}
                        onChange={(e) => emitChange({ checkInRadiusKm: e.target.value })}
                        placeholder="0.5"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                </div>
            </div>

            {/* Radius Quick Presets & Google Maps Preview Link */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500 mr-1">ตั้งค่ารัศมีด่วน:</span>
                    {RADIUS_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => emitChange({ checkInRadiusKm: preset.value })}
                            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors border ${
                                Number(checkInRadiusKm) === Number(preset.value)
                                    ? "bg-teal-600 text-white border-teal-600"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {hasValidCoords && (
                    <a
                        href={`https://www.google.com/maps?q=${latNum},${lngNum}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        ดูหมุดบน Google Maps ({latNum.toFixed(5)}, {lngNum.toFixed(5)})
                    </a>
                )}
            </div>

            {/* Work Shift Start & End Time */}
            {showShiftTime && (
                <div className="pt-3 border-t border-teal-200/60 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Clock className="h-3.5 w-3.5 text-teal-600" />
                        <span>กะเวลาเข้า-ออกงานของสถานที่นี้</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                เวลาเข้างาน (เริ่มกะ)
                            </label>
                            <input
                                type="time"
                                value={workStartTime}
                                onChange={(e) => emitChange({ workStartTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                เวลาเลิกงาน (จบกะ)
                            </label>
                            <input
                                type="time"
                                value={workEndTime}
                                onChange={(e) => emitChange({ workEndTime: e.target.value })}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-slate-500 mr-1">เวลากะมาตรฐาน:</span>
                        {SHIFT_PRESETS.map((preset) => {
                            const active =
                                workStartTime === preset.start && workEndTime === preset.end;
                            return (
                                <button
                                    key={`${preset.start}-${preset.end}`}
                                    type="button"
                                    onClick={() =>
                                        emitChange({
                                            workStartTime: preset.start,
                                            workEndTime: preset.end,
                                        })
                                    }
                                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors border ${
                                        active
                                            ? "bg-teal-600 text-white border-teal-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
