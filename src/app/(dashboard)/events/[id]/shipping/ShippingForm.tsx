"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipment } from "@/actions/event-actions";
import { Truck, Loader2 } from "lucide-react";

type Props = {
    eventId: string;
};

export function ShippingForm({ eventId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [provider, setProvider] = useState("");
    const [trackingNo, setTrackingNo] = useState("");
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        startTransition(async () => {
            try {
                await createShipment(eventId, { provider, trackingNo });
                router.push(`/events/${eventId}`);
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลการจัดส่ง</h3>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        ผู้ให้บริการขนส่ง
                    </label>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                        <option value="">-- เลือกผู้ให้บริการ --</option>
                        <option value="รถบริษัท">รถบริษัท</option>
                        <option value="Kerry">Kerry Express</option>
                        <option value="Flash">Flash Express</option>
                        <option value="J&T">J&T Express</option>
                        <option value="ThaiPost">ไปรษณีย์ไทย</option>
                        <option value="Other">อื่นๆ</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        หมายเลขพัสดุ / Tracking No. (ถ้ามี)
                    </label>
                    <input
                        type="text"
                        value={trackingNo}
                        onChange={(e) => setTrackingNo(e.target.value)}
                        placeholder="เช่น KERXXXXXXXX"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-3 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Truck className="h-5 w-5" />
                    )}
                    ยืนยันการจัดส่ง
                </button>
            </div>
        </form>
    );
}
