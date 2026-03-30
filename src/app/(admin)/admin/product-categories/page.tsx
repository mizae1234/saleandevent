"use client";

import { useActionState, useEffect, useState } from "react";
import { PageHeader, Spinner, FormInput } from "@/components/shared";
import { Plus, Edit2, Archive, ArchiveRestore } from "lucide-react";
import {
    getProductCategories,
    createProductCategory,
    updateProductCategory,
    toggleProductCategoryStatus
} from "@/actions/product-category-actions";

type Category = {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
};

export default function ProductCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const loadCategories = async () => {
        setIsLoading(true);
        const res = await getProductCategories();
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
            res = await updateProductCategory(editingCategory.id, formData);
        } else {
            res = await createProductCategory(formData);
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
        
        await toggleProductCategoryStatus(id, !currentlyActive);
        loadCategories();
    };

    const openCreateDialog = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const openEditDialog = (cat: Category) => {
        setEditingCategory(cat);
        setIsDialogOpen(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <PageHeader
                    title="จัดการหมวดหมู่สินค้า"
                    subtitle="เพิ่ม ลบ แก้ไข หมวดหมู่สินค้าที่ใช้ในระบบ"
                />
                <button
                    onClick={openCreateDialog}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">เพิ่มหมวดหมู่</span>
                </button>
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
                                    <th className="px-6 py-4">ลำดับการแสดง</th>
                                    <th className="px-6 py-4">ชื่อหมวดหมู่</th>
                                    <th className="px-6 py-4">สถานะ</th>
                                    <th className="px-6 py-4 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                            ไม่พบข้อมูลหมวดหมู่สินค้า
                                        </td>
                                    </tr>
                                ) : (
                                    categories.map((cat) => (
                                        <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">
                                                {cat.sortOrder}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {cat.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${cat.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10'}`}>
                                                    {cat.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditDialog(cat)}
                                                        className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(cat.id, cat.isActive)}
                                                        className={`p-1.5 rounded-lg transition-colors ${cat.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                        title={cat.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
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

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsDialogOpen(false)} />
                    
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {editingCategory ? "แก้ไขหมวดหมู่สินค้า" : "เพิ่มหมวดหมู่สินค้าใหม่"}
                            </h3>
                        </div>

                        <form action={formAction} className="p-6 space-y-4">
                            {state?.error && (
                                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                    {state.error}
                                </div>
                            )}

                            <FormInput
                                label="ชื่อหมวดหมู่ *"
                                name="name"
                                defaultValue={editingCategory?.name || ""}
                                required
                                placeholder="เช่น เสื้อ, กางเกง"
                            />

                            <FormInput
                                label="ลำดับการแสดง (น้อยไปมาก)"
                                name="sortOrder"
                                type="number"
                                defaultValue={editingCategory?.sortOrder?.toString() || "0"}
                                required
                            />

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    disabled={isPending}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPending && <Spinner size="sm" />}
                                    {isPending ? "กำลังบันทึก..." : "บันทึก"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
