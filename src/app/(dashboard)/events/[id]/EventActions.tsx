"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveEvent, rejectEvent } from "@/actions/event-actions";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Props = {
    eventId: string;
    status: string;
};

export function EventActions({ eventId, status }: Props) {
    const [isPending, startTransition] = useTransition();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleApprove = () => {
        setError("");
        startTransition(async () => {
            try {
                await approveEvent(eventId);
                // Redirect to packing page after approval
                router.push(`/events/${eventId}/packing`);
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    const handleReject = () => {
        if (!rejectReason.trim()) {
            setError("กรุณาระบุเหตุผล");
            return;
        }
        setError("");
        startTransition(async () => {
            try {
                await rejectEvent(eventId, rejectReason);
                setShowRejectModal(false);
                setRejectReason("");
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    // Only show actions for pending_approval status
    if (status !== "pending_approval") {
        return null;
    }

    return (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">รออนุมัติ</h3>
            <p className="text-sm text-amber-700 mb-4">
                Event นี้รอการอนุมัติจากผู้มีอำนาจ กรุณาตรวจสอบรายละเอียดและดำเนินการ
            </p>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle className="h-5 w-5" />
                    )}
                    อนุมัติ
                </button>
                <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-red-300 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <XCircle className="h-5 w-5" />
                    ไม่อนุมัติ
                </button>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">ระบุเหตุผลที่ไม่อนุมัติ</h4>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="กรุณาระบุเหตุผล..."
                            className="w-full h-32 p-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason("");
                                }}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isPending || !rejectReason.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                ยืนยันไม่อนุมัติ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
