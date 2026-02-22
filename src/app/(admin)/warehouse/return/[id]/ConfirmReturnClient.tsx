"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { confirmReturnReceived } from "@/actions/channel-actions";

type Props = {
    channelId: string;
    totalReturn: number;
};

export function ConfirmReturnClient({ channelId, totalReturn }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();

    const handleConfirm = () => {
        setError("");

        startTransition(async () => {
            try {
                await confirmReturnReceived(channelId);
                router.push("/warehouse/return");
                router.refresh();
            } catch (e: any) {
                setError(e.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
            }
        });
    };

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm">
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                >
                    <CheckCircle2 className="h-5 w-5" />
                    ยืนยันรับคืนสินค้า ({totalReturn} ชิ้น)
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-amber-800 font-medium mb-2">ยืนยันการรับคืน?</p>
                        <p className="text-sm text-amber-700">
                            สินค้า {totalReturn} ชิ้น จะถูกเพิ่มกลับเข้าคลังสินค้า และ Event จะถูกปิดสมบูรณ์
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfirm(false)}
                            disabled={isPending}
                            className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5" />
                            )}
                            ยืนยัน
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
