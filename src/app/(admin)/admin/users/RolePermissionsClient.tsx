"use client";

import { useState, useEffect, useActionState } from "react";
import { MENU_SECTIONS } from "@/config/menu";
import { AVAILABLE_ROLES } from "@/config/roles";
import { saveRolePermissions } from "@/actions/role-permission-actions";
import { Shield, Check, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface RolePermissionData {
    role: string;
    allowedMenus: string[];
}

export default function RolePermissionsPage({
    initialPermissions,
}: {
    initialPermissions: RolePermissionData[];
}) {
    // Build state: for each role, which menu keys are allowed
    const [permissions, setPermissions] = useState<Record<string, string[]>>(() => {
        const map: Record<string, string[]> = {};
        for (const role of AVAILABLE_ROLES) {
            const existing = initialPermissions.find((p) => p.role === role.value);
            map[role.value] = existing ? existing.allowedMenus : [];
        }
        return map;
    });

    const [expandedRole, setExpandedRole] = useState<string | null>("ADMIN");
    const [state, formAction, isPending] = useActionState(saveRolePermissions, undefined);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (state?.success) {
            setShowSuccess(true);
            const t = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(t);
        }
    }, [state]);

    const toggleMenu = (role: string, menuKey: string) => {
        setPermissions((prev) => {
            const current = prev[role] || [];
            if (current.includes(menuKey)) {
                return { ...prev, [role]: current.filter((k) => k !== menuKey) };
            } else {
                return { ...prev, [role]: [...current, menuKey] };
            }
        });
    };

    const toggleAllMenus = (role: string) => {
        setPermissions((prev) => {
            const current = prev[role] || [];
            const allKeys = MENU_SECTIONS.map((s) => s.key);
            if (current.length === allKeys.length) {
                return { ...prev, [role]: [] };
            } else {
                return { ...prev, [role]: allKeys };
            }
        });
    };

    const handleSubmit = () => {
        const formData = new FormData();
        const rolePermissions = AVAILABLE_ROLES.map((r) => ({
            role: r.value,
            allowedMenus: permissions[r.value] || [],
        }));
        formData.set("roles", JSON.stringify(rolePermissions));
        formAction(formData);
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        จัดการสิทธิ์เมนู
                    </h1>
                    <p className="text-slate-500 mt-1 ml-[52px]">
                        กำหนดว่า role ไหนเข้าถึงเมนูกลุ่มใดได้บ้าง
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-200/50 hover:shadow-teal-300/50 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {isPending ? "กำลังบันทึก..." : "บันทึก"}
                </button>
            </div>

            {/* Success / Error */}
            {showSuccess && (
                <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <Check className="h-4 w-4" />
                    บันทึกสิทธิ์เรียบร้อยแล้ว
                </div>
            )}
            {state?.error && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                    {state.error}
                </div>
            )}

            {/* Role Cards */}
            <div className="space-y-4">
                {AVAILABLE_ROLES.map((role) => {
                    const isExpanded = expandedRole === role.value;
                    const allowedCount = (permissions[role.value] || []).length;
                    const totalCount = MENU_SECTIONS.length;
                    const allChecked = allowedCount === totalCount;

                    return (
                        <div
                            key={role.value}
                            className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden transition-all"
                        >
                            {/* Role Header */}
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedRole(isExpanded ? null : role.value)
                                }
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold ${role.value === "ADMIN"
                                            ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                                            : role.value === "MANAGER"
                                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                                : role.value === "WAREHOUSE"
                                                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                                                    : role.value === "FINANCE"
                                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                                                        : "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                                            }`}
                                    >
                                        {role.value.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900">
                                            {role.label}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            เข้าถึง {allowedCount}/{totalCount} กลุ่มเมนู
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Quick Badge */}
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${allChecked
                                            ? "bg-emerald-100 text-emerald-700"
                                            : allowedCount > 0
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {allChecked
                                            ? "ทั้งหมด"
                                            : allowedCount > 0
                                                ? `${allowedCount} กลุ่ม`
                                                : "ไม่มีสิทธิ์"}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-slate-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Menus */}
                            {isExpanded && (
                                <div className="px-6 pb-5 border-t border-slate-100">
                                    {/* Select All */}
                                    <div className="flex items-center justify-between py-3 mb-2">
                                        <span className="text-sm font-medium text-slate-500">
                                            เลือกกลุ่มเมนูที่อนุญาต
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleAllMenus(role.value)
                                            }
                                            className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
                                        >
                                            {allChecked
                                                ? "ยกเลิกทั้งหมด"
                                                : "เลือกทั้งหมด"}
                                        </button>
                                    </div>

                                    <div className="grid gap-3">
                                        {MENU_SECTIONS.map((section) => {
                                            const isChecked = (
                                                permissions[role.value] || []
                                            ).includes(section.key);

                                            return (
                                                <label
                                                    key={section.key}
                                                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked
                                                        ? "border-teal-300 bg-teal-50/50"
                                                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() =>
                                                            toggleMenu(
                                                                role.value,
                                                                section.key
                                                            )
                                                        }
                                                        className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900">
                                                            {section.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {section.items
                                                                .map(
                                                                    (i) =>
                                                                        i.title
                                                                )
                                                                .join(", ")}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info Note */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-sm text-blue-700">
                <p className="font-medium mb-1">💡 หมายเหตุ</p>
                <p>
                    การเปลี่ยนสิทธิ์จะมีผลกับพนักงานที่ login ครั้งถัดไป
                    หากต้องการให้มีผลทันที พนักงานต้อง logout แล้ว login ใหม่
                </p>
            </div>
        </div>
    );
}
