"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { submitForPaymentApproval } from "@/actions/channel-actions";

export function SubmitPaymentButton({ channelId, status }: { channelId: string; status: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [confirm, setConfirm] = useState(false);

    // Only show if event is in a status where payment submission makes sense
    const canSubmit = ['active', 'returned', 'completed'].includes(status);
    if (!canSubmit) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await submitForPaymentApproval(channelId);
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
            setConfirm(false);
        }
    };

    if (!confirm) {
        return (
            <button
                onClick={() => setConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 text-sm font-semibold transition-colors shadow-sm"
            >
                <Send className="h-4 w-4" />
                ส่งอนุมัติจ่าย
            </button>
        );
    }

    return (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">
                ยืนยันส่งอนุมัติจ่ายสำหรับ Event นี้?
            </p>
            <p className="text-xs text-amber-600">
                เมื่อส่งแล้ว รายการจะไปอยู่ที่ "รออนุมัติจ่าย" เพื่อให้ผู้อนุมัติตรวจสอบ
            </p>
            <div className="flex gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {loading ? 'กำลังส่ง...' : 'ยืนยัน'}
                </button>
                <button
                    onClick={() => setConfirm(false)}
                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                    ยกเลิก
                </button>
            </div>
        </div>
    );
}
