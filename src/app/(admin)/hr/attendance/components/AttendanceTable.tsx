"use client";

import { MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDistanceThai } from "@/lib/geo";
import {
    formatBangkokTime,
    formatThaiShortDate,
    resolveShiftTimes,
} from "@/config/attendance";
import {
    LocationTypeBadge,
    CheckInTimingBadge,
    type PhotoLightboxData,
} from "@/components/attendance";
import type { AdminCheckInItem } from "../types";

interface AttendanceTableProps {
    items: AdminCheckInItem[];
    onPreviewPhoto: (photo: PhotoLightboxData) => void;
}

export function AttendanceTable({ items, onPreviewPhoto }: AttendanceTableProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold text-slate-600">
                            <th className="px-4 py-3.5">วันที่</th>
                            <th className="px-4 py-3.5">พนักงาน</th>
                            <th className="px-4 py-3.5">สถานที่</th>
                            <th className="px-4 py-3.5">เข้างาน (Check-in)</th>
                            <th className="px-4 py-3.5">ออกงาน (Check-out)</th>
                            <th className="px-4 py-3.5 text-center">รวมเวลา</th>
                            <th className="px-4 py-3.5">สถานะ / หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item) => {
                            const { shiftStart, shiftEnd } = resolveShiftTimes({
                                locationType: item.locationType,
                                workStartTime: item.shiftStartTime,
                                workEndTime: item.shiftEndTime,
                            });

                            return (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                    {/* Date */}
                                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                                        {formatThaiShortDate(item.dateStr)}
                                    </td>

                                    {/* Staff */}
                                    <td className="px-4 py-3.5">
                                        <div className="font-semibold text-slate-900">
                                            {item.staffName}
                                        </div>
                                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                            <span className="font-mono text-teal-600">
                                                {item.staffCode || "-"}
                                            </span>
                                            <span>•</span>
                                            <span>{item.staffPosition || item.staffRole}</span>
                                        </div>
                                    </td>

                                    {/* Location */}
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1.5">
                                            <LocationTypeBadge locationType={item.locationType} />
                                        </div>
                                        <div className="text-xs font-medium text-slate-800 mt-1">
                                            {item.locationName}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            กะ {shiftStart}–{shiftEnd} น.
                                        </div>
                                    </td>

                                    {/* Check-in */}
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onPreviewPhoto({
                                                        url: item.checkInPhotoUrl,
                                                        title: `Check-in: ${item.staffName}`,
                                                        subtitle: `${item.locationName} • ${formatThaiShortDate(
                                                            item.dateStr
                                                        )} ${formatBangkokTime(item.checkInAt)} น.`,
                                                    })
                                                }
                                                className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:ring-2 hover:ring-teal-500 transition-all"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={item.checkInPhotoUrl}
                                                    alt="Check-in"
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-900">
                                                        {formatBangkokTime(item.checkInAt)} น.
                                                    </span>
                                                    <CheckInTimingBadge lateMinutes={item.lateMinutes} />
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                    {item.checkInDistanceKm !== null && (
                                                        <span>
                                                            ห่าง {formatDistanceThai(item.checkInDistanceKm)}
                                                        </span>
                                                    )}
                                                    <a
                                                        href={`https://www.google.com/maps?q=${item.checkInLat},${item.checkInLng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-teal-600 hover:underline inline-flex items-center gap-0.5"
                                                        title="ดูพิกัดบน Google Maps"
                                                    >
                                                        <MapPin className="h-3 w-3" /> แผนที่
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Check-out */}
                                    <td className="px-4 py-3.5">
                                        {item.checkOutAt ? (
                                            <div className="flex items-center gap-2.5">
                                                {item.checkOutPhotoUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onPreviewPhoto({
                                                                url: item.checkOutPhotoUrl!,
                                                                title: `Check-out: ${item.staffName}`,
                                                                subtitle: `${item.locationName} • ${formatThaiShortDate(
                                                                    item.dateStr
                                                                )} ${formatBangkokTime(item.checkOutAt!)} น.`,
                                                            })
                                                        }
                                                        className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:ring-2 hover:ring-amber-500 transition-all"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.checkOutPhotoUrl}
                                                            alt="Check-out"
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </button>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900">
                                                        {formatBangkokTime(item.checkOutAt)} น.
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        {item.checkOutDistanceKm !== null && (
                                                            <span>
                                                                ห่าง {formatDistanceThai(item.checkOutDistanceKm)}
                                                            </span>
                                                        )}
                                                        {item.checkOutLat !== null &&
                                                            item.checkOutLng !== null && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${item.checkOutLat},${item.checkOutLng}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-teal-600 hover:underline inline-flex items-center gap-0.5"
                                                                >
                                                                    <MapPin className="h-3 w-3" /> แผนที่
                                                                </a>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                กำลังปฏิบัติงาน
                                            </span>
                                        )}
                                    </td>

                                    {/* Hours worked */}
                                    <td className="px-4 py-3.5 text-center font-mono text-xs font-semibold text-slate-700">
                                        {item.hoursWorked !== null ? `${item.hoursWorked} ชม.` : "-"}
                                    </td>

                                    {/* Status & Notes */}
                                    <td className="px-4 py-3.5">
                                        {item.isForgotCheckOut ? (
                                            <div className="space-y-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                    <AlertTriangle className="h-3 w-3" /> ลืม Check-out (นอกพื้นที่)
                                                </span>
                                                {item.forgotCheckOutReason && (
                                                    <p className="text-xs text-amber-800">
                                                        เหตุผล: {item.forgotCheckOutReason}
                                                    </p>
                                                )}
                                            </div>
                                        ) : item.checkOutAt ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="h-3 w-3" /> ปกติ
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">รอ Check-out</span>
                                        )}
                                        {item.checkInNote && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                หมายเหตุ: {item.checkInNote}
                                            </p>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {items.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    ไม่พบรายการลงเวลาเข้า-ออกงานตามเงื่อนไขที่เลือก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
