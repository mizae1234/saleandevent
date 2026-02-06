"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completePacking } from "@/actions/event-actions";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type Props = {
    eventId: string;
    status: string;
};

export function PackingActions({ eventId, status }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const router = useRouter();

    const handleCompletePacking = () => {
        setError("");
        startTransition(async () => {
            try {
                await completePacking(eventId);
                router.push(`/events/${eventId}/shipping`);
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    if (status === 'packed') {
        return (
            <div className="rounded-xl bg-green-50 border border-green-200 p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-2">แพคเสร็จเรียบร้อย ✓</h3>
                <p className="text-sm text-green-700 mb-4">สินค้าพร้อมจัดส่งแล้ว</p>
                <Link
                    href={`/events/${eventId}/shipping`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
                >
                    ดำเนินการจัดส่ง
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">ยืนยันการแพค</h3>
            <p className="text-sm text-amber-700 mb-4">
                ตรวจสอบรายการสินค้าและอุปกรณ์ให้ครบถ้วนก่อนกดยืนยัน
            </p>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleCompletePacking}
                disabled={isPending}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <CheckCircle className="h-5 w-5" />
                )}
                เสร็จสิ้นการแพค
            </button>
        </div>
    );
}
