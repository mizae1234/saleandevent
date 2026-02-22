"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { approvePayment, closeChannelManual } from "@/actions/channel-actions";

export function PaymentApprovalActions({ channelId, status }: { channelId: string; status: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (actionName: string, action: () => Promise<void>) => {
        setLoading(actionName);
        try {
            await action();
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(null);
        }
    };

    const isPending = status === 'pending_payment';
    const isApproved = status === 'payment_approved';

    if (!isPending && !isApproved) return null;

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-4">ดำเนินการ</h3>
            <div className="flex gap-3">
                {/* Approve Payment */}
                {isPending && (
                    <button
                        onClick={() => handleAction('approve', () => approvePayment(channelId))}
                        disabled={loading === 'approve'}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                        {loading === 'approve' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        {loading === 'approve' ? 'กำลังอนุมัติ...' : 'อนุมัติจ่าย'}
                    </button>
                )}

                {/* Close Event — separate from approve */}
                {isApproved && (
                    <button
                        onClick={() => handleAction('close', () => closeChannelManual(channelId))}
                        disabled={loading === 'close'}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-semibold disabled:opacity-50 transition-colors"
                    >
                        {loading === 'close' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                        {loading === 'close' ? 'กำลังปิดงาน...' : 'ปิดงาน'}
                    </button>
                )}
            </div>

            {isPending && (
                <p className="mt-3 text-xs text-slate-500">
                    กดอนุมัติจ่ายเพื่อยืนยันรายจ่ายทั้งหมด เมื่ออนุมัติแล้วจะยังสามารถปิดงานได้ภายหลัง
                </p>
            )}
            {isApproved && (
                <p className="mt-3 text-xs text-slate-500">
                    อนุมัติจ่ายเรียบร้อยแล้ว กดปิดงานเมื่อดำเนินการทุกอย่างเสร็จสิ้น
                </p>
            )}
        </div>
    );
}
