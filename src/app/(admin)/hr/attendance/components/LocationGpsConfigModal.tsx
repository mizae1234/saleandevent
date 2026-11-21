"use client";

import { useState, useTransition } from "react";
import { X, Save } from "lucide-react";
import { GpsCoordinatePicker, Spinner } from "@/components/shared";
import { updateLocationGpsConfig } from "@/actions/attendance-actions";
import {
    DEFAULT_CHECK_IN_RADIUS_KM,
    DEFAULT_HQ_NAME,
    LOCATION_TYPES,
    resolveCheckInRadius,
    resolveShiftTimes,
} from "@/config/attendance";
import { useToast } from "@/components/ui/toast";
import type { HeadOfficeGpsConfig, LocationConfigItem } from "../types";

interface LocationGpsConfigModalProps {
    initialTarget: string; // 'HQ' or channelId
    headOfficeConfig: HeadOfficeGpsConfig;
    channels: LocationConfigItem[];
    onClose: () => void;
    onSuccess: () => void;
}

export function LocationGpsConfigModal({
    initialTarget,
    headOfficeConfig,
    channels,
    onClose,
    onSuccess,
}: LocationGpsConfigModalProps) {
    const { toastSuccess, toastError } = useToast();
    const [isPending, startTransition] = useTransition();

    const getInitialStateForTarget = (target: string) => {
        if (target === LOCATION_TYPES.HQ) {
            const { shiftStart, shiftEnd } = resolveShiftTimes({
                isHeadOffice: true,
                workStartTime: headOfficeConfig.workStartTime,
                workEndTime: headOfficeConfig.workEndTime,
            });
            return {
                lat: headOfficeConfig.latitude !== null ? String(headOfficeConfig.latitude) : "",
                lng: headOfficeConfig.longitude !== null ? String(headOfficeConfig.longitude) : "",
                radius: String(resolveCheckInRadius(headOfficeConfig.checkInRadiusKm)),
                workStart: shiftStart,
                workEnd: shiftEnd,
            };
        }
        const ch = channels.find((c) => c.id === target);
        const { shiftStart, shiftEnd } = resolveShiftTimes({
            isHeadOffice: false,
            workStartTime: ch?.workStartTime,
            workEndTime: ch?.workEndTime,
        });
        return {
            lat: ch && ch.latitude !== null ? String(ch.latitude) : "",
            lng: ch && ch.longitude !== null ? String(ch.longitude) : "",
            radius: String(resolveCheckInRadius(ch?.checkInRadiusKm)),
            workStart: shiftStart,
            workEnd: shiftEnd,
        };
    };

    const initial = getInitialStateForTarget(initialTarget);
    const [selectedTarget, setSelectedTarget] = useState<string>(initialTarget);
    const [gpsLat, setGpsLat] = useState(initial.lat);
    const [gpsLng, setGpsLng] = useState(initial.lng);
    const [gpsRadius, setGpsRadius] = useState(initial.radius);
    const [gpsWorkStart, setGpsWorkStart] = useState(initial.workStart);
    const [gpsWorkEnd, setGpsWorkEnd] = useState(initial.workEnd);

    const handleSelectGpsTarget = (target: string) => {
        setSelectedTarget(target);
        const next = getInitialStateForTarget(target);
        setGpsLat(next.lat);
        setGpsLng(next.lng);
        setGpsRadius(next.radius);
        setGpsWorkStart(next.workStart);
        setGpsWorkEnd(next.workEnd);
    };

    const handleSave = () => {
        const lat = parseFloat(gpsLat);
        const lng = parseFloat(gpsLng);
        const rad = resolveCheckInRadius(gpsRadius);

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            toastError("กรุณาระบุพิกัด Latitude และ Longitude ให้ถูกต้อง");
            return;
        }

        startTransition(async () => {
            const res = await updateLocationGpsConfig({
                targetType: selectedTarget === LOCATION_TYPES.HQ ? "HQ" : "CHANNEL",
                channelId: selectedTarget === LOCATION_TYPES.HQ ? undefined : selectedTarget,
                latitude: lat,
                longitude: lng,
                checkInRadiusKm: rad,
                workStartTime: gpsWorkStart,
                workEndTime: gpsWorkEnd,
            });
            if (res.error) {
                toastError(res.error);
            } else {
                toastSuccess("บันทึกพิกัด รัศมี และกะเวลาเข้า-ออกงานเรียบร้อยแล้ว");
                onSuccess();
                onClose();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 my-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            ตั้งค่าพิกัด GPS และกะเวลาเข้า-ออกงาน
                        </h3>
                        <p className="text-xs text-slate-500">
                            เลือกสำนักงานใหญ่ หรือ สาขา / Event ที่ต้องการกำหนดพิกัดและเวลากะทำงาน
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        เลือกสถานที่ที่ต้องการตั้งค่าพิกัด
                    </label>
                    <select
                        value={selectedTarget}
                        onChange={(e) => handleSelectGpsTarget(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white font-medium"
                    >
                        <option value="HQ">
                            🏢 {headOfficeConfig.branchName || DEFAULT_HQ_NAME} (Head Office)
                        </option>
                        <optgroup label="สาขา / Event ทั้งหมด">
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                    [{ch.code}] {ch.name}{" "}
                                    {ch.latitude !== null
                                        ? `(ตั้งค่าแล้ว: ${ch.checkInRadiusKm ?? DEFAULT_CHECK_IN_RADIUS_KM} กม.)`
                                        : "(ยังไม่ระบุพิกัด)"}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <GpsCoordinatePicker
                    latitude={gpsLat}
                    longitude={gpsLng}
                    checkInRadiusKm={gpsRadius}
                    workStartTime={gpsWorkStart}
                    workEndTime={gpsWorkEnd}
                    onChange={(vals) => {
                        setGpsLat(vals.latitude);
                        setGpsLng(vals.longitude);
                        setGpsRadius(vals.checkInRadiusKm);
                        if (vals.workStartTime !== undefined) setGpsWorkStart(vals.workStartTime);
                        if (vals.workEndTime !== undefined) setGpsWorkEnd(vals.workEndTime);
                    }}
                    required
                    showShiftTime
                    title="พิกัด รัศมี และกะเวลาเข้า-ออกงาน"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        {isPending ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                        <span>บันทึกพิกัด</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
