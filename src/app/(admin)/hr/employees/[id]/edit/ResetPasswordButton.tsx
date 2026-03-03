"use client";

import { useState } from "react";
import { KeyRound, RotateCcw } from "lucide-react";
import { resetPasswordAction } from "@/actions/auth-actions";

export function ResetPasswordButton({ staffId, staffName, adminId }: {
    staffId: string;
    staffName: string;
    adminId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; password?: string; error?: string } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = async () => {
        setLoading(true);
        try {
            const res = await resetPasswordAction(staffId, adminId);
            setResult(res);
            setShowConfirm(false);
        } catch {
            setResult({ error: "เกิดข้อผิดพลาด" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl bg-white border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                รีเซ็ตรหัสผ่าน
            </h3>

            {result?.success && (
                <div className="mb-3 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100">
                    ✅ รีเซ็ตรหัสผ่านสำเร็จ — รหัสใหม่: <span className="font-mono font-bold">{result.password}</span>
                </div>
            )}

            {result?.error && (
                <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                    ❌ {result.error}
                </div>
            )}

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                >
                    <RotateCcw className="h-4 w-4" />
                    รีเซ็ตเป็นค่าเริ่มต้น (วันเกิด)
                </button>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                        ยืนยันรีเซ็ตรหัสผ่านของ <strong>{staffName}</strong> กลับเป็นวันเกิด (ddMMyyyy พ.ศ.) ?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50"
                        >
                            {loading ? "กำลังรีเซ็ต..." : "ยืนยันรีเซ็ต"}
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
