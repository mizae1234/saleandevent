"use client";

import { useActionState, useEffect, useState } from "react";
import { PageHeader, Spinner, FormInput } from "@/components/shared";
import { Plus, Edit2, Archive, ArchiveRestore, Receipt, ShieldAlert, CheckCircle2 } from "lucide-react";
import {
    getExpenseCategories,
    createExpenseCategory,
    updateExpenseCategory,
    toggleExpenseCategoryStatus
} from "@/actions/expense-category-actions";

type ExpenseCategoryItem = {
    id: string;
    name: string;
    type: string;
    whtType: string;
    sortOrder: number;
    isActive: boolean;
};

export default function ExpenseCategoriesPage() {
    const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategoryItem | null>(null);

    const loadCategories = async () => {
        setIsLoading(true);
        const res = await getExpenseCategories();
        if (res.success && res.data) {
            setCategories(res.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const action = async (_prev: any, formData: FormData) => {
        let res;
        if (editingCategory) {
            res = await updateExpenseCategory(editingCategory.id, formData);
        } else {
            res = await createExpenseCategory(formData);
        }

        if (res?.error) {
            return { error: res.error };
        }

        setIsDialogOpen(false);
        loadCategories();
        return { success: true };
    };

    const [state, formAction, isPending] = useActionState(action, undefined);

    const handleToggleStatus = async (id: string, currentlyActive: boolean) => {
        if (!confirm(`คุณต้องการ${currentlyActive ? 'ปิด' : 'เปิด'}การใช้งานหมวดหมู่นี้ใช่หรือไม่?`)) return;

        await toggleExpenseCategoryStatus(id, !currentlyActive);
        loadCategories();
    };

    const openCreateDialog = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (cat: ExpenseCategoryItem) => {
        setEditingCategory(cat);
        setIsDialogOpen(true);
    };

    const getWhtBadge = (whtType: string) => {
        switch (whtType) {
            case '40_1':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        ม.40(1) (ค่าจ้าง/ลง-เก็บของ)
                    </span>
                );
            case '40_2':
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ม.40(2) (คอมฯ/ค่าเป้า)
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        ไม่คิดภาษี (None)
                    </span>
                );
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    title="จัดการหมวดหมู่ค่าใช้จ่าย & ภาษีหัก ณ ที่จ่าย"
                    subtitle="กำหนดประเภทค่าใช้จ่าย และการจัดกลุ่มภาษี ม.40(1) / ม.40(2) สำหรับคำนวณหัก ณ ที่จ่าย 3%"
                />
                <button
                    onClick={openCreateDialog}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors text-sm font-medium"
                >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มหมวดหมู่</span>
                </button>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    กฎการคำนวณภาษีหัก ณ ที่จ่าย 3% (Withholding Tax):
                </p>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    <li><strong className="text-blue-700">ม.40(1):</strong> รวมฐานกับค่าแรง (เช่น ค่าลงงาน, ค่าเก็บงาน) $\rightarrow$ หัก 3%</li>
                    <li><strong className="text-emerald-700">ม.40(2):</strong> รวมฐานกับค่าคอมมิสชั่น (เช่น ค่าเป้า) $\rightarrow$ หัก 3% เสมอ</li>
                    <li><strong>ไม่คิดภาษี:</strong> ค่าใช้จ่ายเบิกจ่ายตามจริง (เช่น ค่าเดินทาง, ค่าที่พัก, อื่นๆ)</li>
                </ul>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-5 py-3 w-16 text-center">ลำดับ</th>
                                    <th className="px-5 py-3">ชื่อหมวดหมู่ค่าใช้จ่าย</th>
                                    <th className="px-5 py-3">การมองเห็น</th>
                                    <th className="px-5 py-3">กลุ่มภาษี หัก ณ ที่จ่าย</th>
                                    <th className="px-5 py-3 text-center">สถานะ</th>
                                    <th className="px-5 py-3 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                                            ไม่พบข้อมูลหมวดหมู่ค่าใช้จ่าย
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map((cat) => (
                                        <tr
                                            key={cat.id}
                                            className={`hover:bg-slate-50/60 transition-colors ${!cat.isActive ? 'opacity-60 bg-slate-50/40' : ''}`}
                                        >
                                            <td className="px-5 py-3.5 text-center text-slate-400 text-xs">
                                                {cat.sortOrder}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-slate-800">
                                                {cat.name}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cat.type === 'emp' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
                                                    {cat.type === 'emp' ? 'พนักงาน/ทั่วไป' : 'แอดมินเท่านั้น'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {getWhtBadge(cat.whtType)}
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                {cat.isActive ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        ใช้งานอยู่
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                                        ปิดใช้งาน
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openEditDialog(cat)}
                                                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(cat.id, cat.isActive)}
                                                        className={`p-1.5 rounded-lg transition-colors ${cat.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                        title={cat.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                                                    >
                                                        {cat.isActive ? (
                                                            <Archive className="h-4 w-4" />
                                                        ) : (
                                                            <ArchiveRestore className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-800">
                                {editingCategory ? "แก้ไขหมวดหมู่ค่าใช้จ่าย" : "เพิ่มหมวดหมู่ค่าใช้จ่าย"}
                            </h3>
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form action={formAction} className="p-6 space-y-4">
                            {state?.error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                                    {state.error}
                                </div>
                            )}

                            <div>
                                <FormInput
                                    label="ชื่อหมวดหมู่ค่าใช้จ่าย"
                                    name="name"
                                    defaultValue={editingCategory?.name || ""}
                                    placeholder="เช่น ค่าลงงาน, ค่าเดินทาง, ค่าที่พัก"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    สิทธิ์การมองเห็น (Type)
                                </label>
                                <select
                                    name="type"
                                    defaultValue={editingCategory?.type || "emp"}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                >
                                    <option value="emp">พนักงานและแอดมินมองเห็น (emp)</option>
                                    <option value="admin">เฉพาะแอดมินมองเห็น (admin)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    การคำนวณภาษีหัก ณ ที่จ่าย (Withholding Tax 3%)
                                </label>
                                <select
                                    name="whtType"
                                    defaultValue={editingCategory?.whtType || "none"}
                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                                >
                                    <option value="none">⚪ ไม่คิดภาษีหัก ณ ที่จ่าย (None / ยกเว้น)</option>
                                    <option value="40_1">🔵 เงินได้ ม.40(1) — รวมกับค่าแรง (หัก 3%)</option>
                                    <option value="40_2">🟢 เงินได้ ม.40(2) — รวมกับค่าคอมมิสชั่น (หัก 3%)</option>
                                </select>
                                <p className="text-xs text-slate-400 mt-1">
                                    * ตัวอย่าง: ค่าลงงาน/ค่าเก็บงาน $\rightarrow$ ม.40(1), ค่าเป้า $\rightarrow$ ม.40(2), ค่าเดินทาง $\rightarrow$ ไม่คิดภาษี
                                </p>
                            </div>

                            <div>
                                <FormInput
                                    label="ลำดับการแสดงผล"
                                    name="sortOrder"
                                    type="number"
                                    defaultValue={editingCategory?.sortOrder?.toString() || "0"}
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                                >
                                    {isPending && <Spinner size="sm" />}
                                    <span>{editingCategory ? "บันทึกการแก้ไข" : "สร้างหมวดหมู่"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
