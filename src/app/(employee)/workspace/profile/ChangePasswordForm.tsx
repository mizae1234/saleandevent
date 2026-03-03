"use client";

import { useState, useActionState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { changePasswordAction } from "@/actions/auth-actions";

export function ChangePasswordForm({ staffId }: { staffId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [state, formAction, isPending] = useActionState(changePasswordAction, undefined);

    if (!isOpen) {
        return (
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                >
                    <KeyRound className="h-4 w-4" />
                    เปลี่ยนรหัสผ่าน
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-600" />
                เปลี่ยนรหัสผ่าน
            </h3>

            {state?.success && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100">
                    ✅ เปลี่ยนรหัสผ่านสำเร็จ
                </div>
            )}

            {state?.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                    ❌ {state.error}
                </div>
            )}

            <form action={formAction} className="space-y-3">
                <input type="hidden" name="staffId" value={staffId} />

                {/* Current Password */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">รหัสผ่านปัจจุบัน</label>
                    <div className="relative">
                        <input
                            type={showCurrent ? "text" : "password"}
                            name="currentPassword"
                            required
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 pr-10"
                            placeholder="กรอกรหัสผ่านปัจจุบัน"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">รหัสผ่านใหม่</label>
                    <div className="relative">
                        <input
                            type={showNew ? "text" : "password"}
                            name="newPassword"
                            required
                            minLength={6}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 pr-10"
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="text-xs text-slate-500 mb-1 block">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative">
                        <input
                            type={showConfirm ? "text" : "password"}
                            name="confirmPassword"
                            required
                            minLength={6}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 pr-10"
                            placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isPending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        ยกเลิก
                    </button>
                </div>
            </form>
        </div>
    );
}
