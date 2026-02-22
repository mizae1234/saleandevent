"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth-actions";
import { Lock, Eye, EyeOff, UserRound } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(loginAction, undefined);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-200/50 mb-4">
                        <span className="text-white font-bold text-2xl">SJ</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Saran Jeans</h1>
                    <p className="text-slate-500 mt-1">Sales & Event Management</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] p-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">เข้าสู่ระบบ</h2>

                    {/* Error */}
                    {state?.error && (
                        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                            {state.error}
                        </div>
                    )}

                    <form action={formAction} className="space-y-5">
                        {/* Employee Code */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">รหัสพนักงาน</label>
                            <div className="relative">
                                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    name="code"
                                    required
                                    autoComplete="username"
                                    placeholder="S0001"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-all uppercase"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">รหัสผ่าน</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white focus:outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">รหัสผ่านเริ่มต้น: วันเดือนปีเกิด (เช่น 15061995)</p>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-200/50 hover:shadow-teal-300/50 hover:from-teal-700 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    กำลังเข้าสู่ระบบ...
                                </span>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    © 2026 Saran Jeans — Unified Sales Management
                </p>
            </div>
        </div>
    );
}
