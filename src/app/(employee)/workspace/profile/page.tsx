import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { User, Mail, Phone, Building2, LogOut, CreditCard, Landmark } from "lucide-react";
import { LogOutButton } from "@/components/layout/LogOutButton";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ProfilePage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const staff = await db.staff.findUnique({
        where: { id: session.staffId },
    });

    if (!staff) redirect('/login');

    return (
        <div className="space-y-6">
            {/* Avatar + Name */}
            <div className="rounded-2xl bg-white border border-slate-100 p-6 text-center">
                <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold text-white">
                        {staff.name.charAt(0).toUpperCase()}
                    </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{staff.name}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{staff.role || 'พนักงาน'}</p>
            </div>

            {/* Info */}
            <div className="rounded-2xl bg-white border border-slate-100 divide-y divide-slate-100">
                {staff.email && (
                    <div className="flex items-center gap-3 px-5 py-4">
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-slate-400">อีเมล</p>
                            <p className="text-sm text-slate-700">{staff.email}</p>
                        </div>
                    </div>
                )}
                {staff.phone && (
                    <div className="flex items-center gap-3 px-5 py-4">
                        <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-slate-400">เบอร์โทร</p>
                            <p className="text-sm text-slate-700">{staff.phone}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3 px-5 py-4">
                    <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div>
                        <p className="text-[11px] text-slate-400">ตำแหน่ง</p>
                        <p className="text-sm text-slate-700">{staff.position || staff.role || 'พนักงาน'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-4">
                    <Landmark className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div>
                        <p className="text-[11px] text-slate-400">ธนาคาร</p>
                        <p className="text-sm text-slate-700">{staff.bankName || <span className="text-slate-400">ยังไม่ระบุ</span>}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-4">
                    <CreditCard className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div>
                        <p className="text-[11px] text-slate-400">เลขที่บัญชี</p>
                        <p className="text-sm text-slate-700 font-mono">{staff.bankAccountNo || <span className="text-slate-400 font-sans">ยังไม่ระบุ</span>}</p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <ChangePasswordForm staffId={staff.id} />

            {/* Logout */}
            <div className="rounded-2xl bg-white border border-slate-100 p-4">
                <form action={async () => {
                    'use server';
                    const { logoutAction } = await import("@/actions/auth-actions");
                    await logoutAction();
                }}>
                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        ออกจากระบบ
                    </button>
                </form>
            </div>
        </div>
    );
}
