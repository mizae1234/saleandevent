"use client";

import { useState, useEffect, useActionState, useTransition, useMemo } from "react";
import { MENU_SECTIONS } from "@/config/menu";
import { AVAILABLE_ROLES } from "@/config/roles";
import { saveRolePermissions, saveStaffPermissions } from "@/actions/role-permission-actions";
import { Shield, Check, Save, ChevronDown, ChevronUp, Users, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/shared";

interface RolePermissionData {
    role: string;
    allowedMenus: string[];
}

interface StaffPermData {
    id: string;
    code: string | null;
    name: string;
    role: string;
    allowedMenus: string[] | null;
    canViewSalary: boolean;
}

const STAFF_PAGE_SIZE = 10;

export default function RolePermissionsPage({
    initialPermissions,
    staffList = [],
}: {
    initialPermissions: RolePermissionData[];
    staffList?: StaffPermData[];
}) {
    // ======== Role-based permissions ========
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
            return current.includes(menuKey)
                ? { ...prev, [role]: current.filter((k) => k !== menuKey) }
                : { ...prev, [role]: [...current, menuKey] };
        });
    };

    const toggleAllMenus = (role: string) => {
        setPermissions((prev) => {
            const allKeys = MENU_SECTIONS.map((s) => s.key);
            return { ...prev, [role]: (prev[role] || []).length === allKeys.length ? [] : allKeys };
        });
    };

    const handleSubmit = () => {
        const formData = new FormData();
        formData.set("roles", JSON.stringify(
            AVAILABLE_ROLES.map((r) => ({ role: r.value, allowedMenus: permissions[r.value] || [] }))
        ));
        formAction(formData);
    };

    // ======== Per-staff permissions ========
    // allowedMenus can contain section keys ("finance") and/or item hrefs ("/hr/employees")
    const [staffPerms, setStaffPerms] = useState<Record<string, { menus: string[] | null; salary: boolean; isCustom: boolean }>>(() => {
        const map: Record<string, { menus: string[] | null; salary: boolean; isCustom: boolean }> = {};
        for (const s of staffList) {
            // If no custom menus, inherit from role
            const roleMenus = initialPermissions.find(p => p.role === s.role)?.allowedMenus || [];
            map[s.id] = {
                menus: s.allowedMenus && s.allowedMenus.length > 0 ? s.allowedMenus : roleMenus.length > 0 ? [...roleMenus] : null,
                salary: s.canViewSalary,
                isCustom: s.allowedMenus !== null && s.allowedMenus.length > 0,
            };
        }
        return map;
    });
    const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
    const [expandedStaffSection, setExpandedStaffSection] = useState<string | null>(null);
    const [savingStaff, startSaving] = useTransition();
    const [staffSaved, setStaffSaved] = useState<string | null>(null);
    const [staffSearch, setStaffSearch] = useState("");
    const [staffPage, setStaffPage] = useState(1);

    const filteredStaff = useMemo(() => {
        if (!staffSearch) return staffList;
        const q = staffSearch.toLowerCase();
        return staffList.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.code || "").toLowerCase().includes(q) ||
            s.role.toLowerCase().includes(q)
        );
    }, [staffList, staffSearch]);

    const totalStaffPages = Math.ceil(filteredStaff.length / STAFF_PAGE_SIZE);
    const pagedStaff = filteredStaff.slice((staffPage - 1) * STAFF_PAGE_SIZE, staffPage * STAFF_PAGE_SIZE);

    // Check if a section is fully selected for a staff
    const isStaffSectionFull = (staffId: string, sectionKey: string) => {
        const perm = staffPerms[staffId];
        if (!perm?.menus) return false;
        return perm.menus.includes(sectionKey);
    };

    // Check if a specific item href is selected for a staff
    const isStaffItemSelected = (staffId: string, sectionKey: string, href: string) => {
        const perm = staffPerms[staffId];
        if (!perm?.menus) return false;
        // If full section is selected, all items are selected
        if (perm.menus.includes(sectionKey)) return true;
        return perm.menus.includes(href);
    };

    // Toggle entire section for a staff
    const toggleStaffSection = (staffId: string, sectionKey: string) => {
        setStaffPerms(prev => {
            const current = prev[staffId] || { menus: null, salary: false, isCustom: false };
            const menus = current.menus || [];
            const section = MENU_SECTIONS.find(s => s.key === sectionKey);
            if (!section) return prev;

            if (menus.includes(sectionKey)) {
                // Remove section key and all its item hrefs
                const itemHrefs = section.items.map(i => i.href);
                const newMenus = menus.filter(m => m !== sectionKey && !itemHrefs.includes(m));
                return { ...prev, [staffId]: { ...current, menus: newMenus.length > 0 ? newMenus : null, isCustom: true } };
            } else {
                // Add section key, remove individual item hrefs (section key covers all)
                const itemHrefs = section.items.map(i => i.href);
                const newMenus = [...menus.filter(m => !itemHrefs.includes(m)), sectionKey];
                return { ...prev, [staffId]: { ...current, menus: newMenus, isCustom: true } };
            }
        });
    };

    // Toggle individual item for a staff
    const toggleStaffItem = (staffId: string, sectionKey: string, href: string) => {
        setStaffPerms(prev => {
            const current = prev[staffId] || { menus: null, salary: false, isCustom: false };
            let menus = [...(current.menus || [])];
            const section = MENU_SECTIONS.find(s => s.key === sectionKey);
            if (!section) return prev;

            if (menus.includes(sectionKey)) {
                // Section was fully selected — remove section key and add all items EXCEPT the toggled one
                menus = menus.filter(m => m !== sectionKey);
                section.items.forEach(item => {
                    if (item.href !== href) menus.push(item.href);
                });
            } else if (menus.includes(href)) {
                // Remove this specific item
                menus = menus.filter(m => m !== href);
            } else {
                // Add this specific item
                menus.push(href);
                // Check if all items are now selected — if so, replace with section key
                const allItemHrefs = section.items.map(i => i.href);
                if (allItemHrefs.every(h => menus.includes(h))) {
                    menus = menus.filter(m => !allItemHrefs.includes(m));
                    menus.push(sectionKey);
                }
            }

            return { ...prev, [staffId]: { ...current, menus: menus.length > 0 ? menus : null, isCustom: true } };
        });
    };

    const toggleStaffSalary = (staffId: string) => {
        setStaffPerms(prev => {
            const current = prev[staffId] || { menus: null, salary: false, isCustom: false };
            return { ...prev, [staffId]: { ...current, salary: !current.salary } };
        });
    };

    const clearStaffMenus = (staffId: string) => {
        // Reset to role defaults
        const staff = staffList.find(s => s.id === staffId);
        const roleMenus = staff ? (initialPermissions.find(p => p.role === staff.role)?.allowedMenus || []) : [];
        setStaffPerms(prev => {
            const current = prev[staffId] || { menus: null, salary: false, isCustom: false };
            return { ...prev, [staffId]: { ...current, menus: roleMenus.length > 0 ? [...roleMenus] : null, isCustom: false } };
        });
    };

    const handleSaveStaff = (staffId: string) => {
        const perm = staffPerms[staffId];
        if (!perm) return;
        // If not custom, save null to DB (use role default)
        const menusToSave = perm.isCustom ? perm.menus : null;
        startSaving(async () => {
            await saveStaffPermissions(staffId, menusToSave, perm.salary);
            setStaffSaved(staffId);
            setTimeout(() => setStaffSaved(null), 2000);
        });
    };

    const roleLabel = (role: string) => AVAILABLE_ROLES.find(r => r.value === role)?.label || role;

    // Count how many items a staff has access to in a section
    const countStaffSectionItems = (staffId: string, sectionKey: string) => {
        const perm = staffPerms[staffId];
        if (!perm?.menus) return 0;
        const section = MENU_SECTIONS.find(s => s.key === sectionKey);
        if (!section) return 0;
        if (perm.menus.includes(sectionKey)) return section.items.length;
        return section.items.filter(i => perm.menus!.includes(i.href)).length;
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
                    <p className="text-slate-500 mt-1 ml-[52px]">กำหนดสิทธิ์ตาม Role และกำหนดรายบุคคล</p>
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-200/50 hover:shadow-teal-300/50 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isPending ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                    {isPending ? "กำลังบันทึก..." : "บันทึก Role"}
                </button>
            </div>

            {/* Info Note */}
            <div className="mb-6 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-sm text-blue-700">
                <p className="font-medium mb-1">💡 หมายเหตุ</p>
                <p>การเปลี่ยนสิทธิ์จะมีผลกับพนักงานที่ login ครั้งถัดไป หากต้องการให้มีผลทันที พนักงานต้อง logout แล้ว login ใหม่</p>
            </div>

            {/* Success / Error */}
            {showSuccess && (
                <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2">
                    <Check className="h-4 w-4" /> บันทึกสิทธิ์เรียบร้อยแล้ว
                </div>
            )}
            {state?.error && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" /> {state.error}
                </div>
            )}

            {/* ===== Section 1: Role-based ===== */}
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-400" /> สิทธิ์ตาม Role
            </h2>
            <div className="space-y-4 mb-10">
                {AVAILABLE_ROLES.map((role) => {
                    const isExpanded = expandedRole === role.value;
                    const allowedCount = (permissions[role.value] || []).length;
                    const totalCount = MENU_SECTIONS.length;
                    const allChecked = allowedCount === totalCount;

                    return (
                        <div key={role.value} className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                            <button type="button" onClick={() => setExpandedRole(isExpanded ? null : role.value)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold ${role.value === "ADMIN" ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                                        : role.value === "MANAGER" ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                                            : role.value === "WAREHOUSE" ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                                                : role.value === "FINANCE" ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                                                    : role.value === "HR" ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white"
                                                        : "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                                        }`}>{role.value.charAt(0)}</div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-900">{role.label}</p>
                                        <p className="text-xs text-slate-500">เข้าถึง {allowedCount}/{totalCount} กลุ่มเมนู</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${allChecked ? "bg-emerald-100 text-emerald-700" : allowedCount > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                        {allChecked ? "ทั้งหมด" : allowedCount > 0 ? `${allowedCount} กลุ่ม` : "ไม่มีสิทธิ์"}
                                    </span>
                                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="px-6 pb-5 border-t border-slate-100">
                                    <div className="flex items-center justify-between py-3 mb-2">
                                        <span className="text-sm font-medium text-slate-500">เลือกกลุ่มเมนูที่อนุญาต</span>
                                        <button type="button" onClick={() => toggleAllMenus(role.value)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">{allChecked ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</button>
                                    </div>
                                    <div className="grid gap-3">
                                        {MENU_SECTIONS.map((section) => {
                                            const isChecked = (permissions[role.value] || []).includes(section.key);
                                            return (
                                                <label key={section.key} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? "border-teal-300 bg-teal-50/50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"}`}>
                                                    <input type="checkbox" checked={isChecked} onChange={() => toggleMenu(role.value, section.key)} className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900">{section.title}</p>
                                                        <p className="text-xs text-slate-500 mt-1">{section.items.map((i) => i.title).join(", ")}</p>
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

            {/* ===== Section 2: Per-staff ===== */}
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-400" /> กำหนดสิทธิ์รายบุคคล
            </h2>
            <p className="text-xs text-slate-400 mb-4">เลือกเมนูที่อนุญาตให้แต่ละคน (ย่อยถึง submenu ได้) ถ้าไม่เลือกเลยจะใช้สิทธิ์ตาม Role</p>

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => { setStaffSearch(e.target.value); setStaffPage(1); }}
                    placeholder="ค้นหาพนักงาน (ชื่อ, รหัส, Role)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                />
            </div>

            <div className="text-xs text-slate-400 mb-3">แสดง {pagedStaff.length} จาก {filteredStaff.length} คน</div>

            <div className="space-y-3 mb-4">
                {pagedStaff.map((staff) => {
                    const isExpanded = expandedStaff === staff.id;
                    const perm = staffPerms[staff.id] || { menus: null, salary: false };
                    const hasCustom = perm.isCustom;

                    return (
                        <div key={staff.id} className="bg-white rounded-xl shadow-[0_1px_6px_-2px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                            <button type="button" onClick={() => { setExpandedStaff(isExpanded ? null : staff.id); setExpandedStaffSection(null); }}
                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-slate-400 w-12">{staff.code}</span>
                                    <span className="font-medium text-slate-800">{staff.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${staff.role === "ADMIN" ? "bg-purple-100 text-purple-700"
                                        : staff.role === "MANAGER" ? "bg-blue-100 text-blue-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}>{staff.role}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {perm.salary && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">ดูเงินเดือน</span>}
                                    {hasCustom && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-100 text-teal-700">กำหนดเอง</span>}
                                    {staffSaved === staff.id && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">✓ บันทึกแล้ว</span>}
                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-4">
                                    {/* Salary toggle */}
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={perm.salary} onChange={() => toggleStaffSalary(staff.id)}
                                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                                        <div className="flex items-center gap-1.5">
                                            {perm.salary ? <Eye className="h-3.5 w-3.5 text-amber-600" /> : <EyeOff className="h-3.5 w-3.5 text-slate-400" />}
                                            <span className="text-sm text-slate-700">ดูข้อมูลเงินเดือน/ค่าแรง</span>
                                        </div>
                                    </label>

                                    {/* Menu selection with submenu drill-down */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-slate-500">เมนูที่อนุญาต (กดเพื่อเลือก submenu)</span>
                                            {hasCustom && (
                                                <button type="button" onClick={() => clearStaffMenus(staff.id)}
                                                    className="text-[10px] text-red-500 hover:text-red-700 font-medium">ล้าง (ใช้ตาม Role)</button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {MENU_SECTIONS.map(section => {
                                                const isFull = isStaffSectionFull(staff.id, section.key);
                                                const itemCount = countStaffSectionItems(staff.id, section.key);
                                                const isOpen = expandedStaffSection === `${staff.id}:${section.key}`;

                                                return (
                                                    <div key={section.key} className={`rounded-lg border overflow-hidden transition-colors ${isFull ? "border-teal-300 bg-teal-50/30" : itemCount > 0 ? "border-blue-200 bg-blue-50/20" : "border-slate-100"}`}>
                                                        {/* Section header */}
                                                        <div className="flex items-center gap-2 p-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={isFull}
                                                                ref={(el) => { if (el) el.indeterminate = !isFull && itemCount > 0; }}
                                                                onChange={() => toggleStaffSection(staff.id, section.key)}
                                                                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                            />
                                                            <button type="button"
                                                                onClick={() => setExpandedStaffSection(isOpen ? null : `${staff.id}:${section.key}`)}
                                                                className="flex-1 flex items-center justify-between text-left">
                                                                <span className="text-sm font-medium text-slate-800">{section.title}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {itemCount > 0 && !isFull && (
                                                                        <span className="text-[10px] text-blue-600 font-medium">{itemCount}/{section.items.length}</span>
                                                                    )}
                                                                    {isFull && <span className="text-[10px] text-teal-600 font-medium">ทั้งหมด</span>}
                                                                    {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                                                </div>
                                                            </button>
                                                        </div>

                                                        {/* Submenu items */}
                                                        {isOpen && (
                                                            <div className="border-t border-slate-100 bg-white/80 px-3 py-2 space-y-1">
                                                                {section.items.map(item => {
                                                                    const checked = isStaffItemSelected(staff.id, section.key, item.href);
                                                                    const Icon = item.icon;
                                                                    return (
                                                                        <label key={item.href} className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-sm transition-colors ${checked ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={checked}
                                                                                onChange={() => toggleStaffItem(staff.id, section.key, item.href)}
                                                                                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                                                            />
                                                                            <Icon className="h-3.5 w-3.5 text-slate-400" />
                                                                            <span className="text-slate-700">{item.title}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {!hasCustom && (
                                            <p className="text-[10px] text-slate-400 mt-2">ใช้สิทธิ์ตาม Role: {roleLabel(staff.role)}</p>
                                        )}
                                    </div>

                                    {/* Save button */}
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => handleSaveStaff(staff.id)} disabled={savingStaff}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors disabled:opacity-50">
                                            {savingStaff ? <Spinner size="xs" /> : <Save className="h-3 w-3" />}
                                            บันทึก
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalStaffPages > 1 && (
                <div className="flex items-center justify-center gap-2 mb-8">
                    <button disabled={staffPage <= 1} onClick={() => setStaffPage(p => p - 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                        <ChevronLeft className="h-4 w-4 text-slate-500" />
                    </button>
                    <span className="text-sm text-slate-600">หน้า {staffPage}/{totalStaffPages}</span>
                    <button disabled={staffPage >= totalStaffPages} onClick={() => setStaffPage(p => p + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors">
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                    </button>
                </div>
            )}


        </div>
    );
}
