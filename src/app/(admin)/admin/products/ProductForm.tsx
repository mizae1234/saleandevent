"use client";

import { useActionState } from "react";
import { createProduct, updateProduct } from "@/actions/product-actions";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

interface ProductFormProps {
    mode: "create" | "edit";
    product?: {
        barcode: string;
        code: string | null;
        name: string;
        size: string | null;
        price: number | null;
        category: string | null;
        producttype: string | null;
        color: string | null;
    };
}

export function ProductForm({ mode, product }: ProductFormProps) {
    const isEdit = mode === "edit";

    const action = isEdit
        ? async (_prev: { error?: string } | undefined, formData: FormData) => {
            return updateProduct(product!.barcode, formData);
        }
        : async (_prev: { error?: string } | undefined, formData: FormData) => {
            return createProduct(formData);
        };

    const [state, formAction, isPending] = useActionState(action, undefined);

    const CATEGORIES = [
        "กางเกงยีนส์",
        "กางเกงขาสั้น",
        "เสื้อ",
        "กระเป๋า",
        "เข็มขัด",
        "Display",
        "Supplies",
        "อุปกรณ์",
        "อื่นๆ",
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/products"
                    className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {isEdit ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                    </h2>
                    <p className="text-slate-500 mt-0.5 text-sm">
                        {isEdit ? `แก้ไขข้อมูลสินค้า ${product?.name}` : "กรอกข้อมูลสินค้าที่ต้องการเพิ่ม"}
                    </p>
                </div>
            </div>

            {/* Error */}
            {state?.error && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                    {state.error}
                </div>
            )}

            <form action={formAction}>
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-6 space-y-5">
                    {/* Barcode */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            บาร์โค้ด <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="barcode"
                            defaultValue={product?.barcode || ""}
                            readOnly={isEdit}
                            required
                            placeholder="สแกนหรือกรอกบาร์โค้ด"
                            className={`w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors ${isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                        {isEdit && (
                            <p className="text-xs text-slate-400 mt-1">บาร์โค้ดไม่สามารถแก้ไขได้</p>
                        )}
                    </div>

                    {/* Code & Name row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                รหัสสินค้า
                            </label>
                            <input
                                type="text"
                                name="code"
                                defaultValue={product?.code || ""}
                                placeholder="เช่น P001"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ชื่อสินค้า <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={product?.name || ""}
                                required
                                placeholder="ชื่อสินค้า"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Size, Color, Category */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ไซส์
                            </label>
                            <input
                                type="text"
                                name="size"
                                defaultValue={product?.size || ""}
                                placeholder="เช่น 28, 30, M, L"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                สี
                            </label>
                            <input
                                type="text"
                                name="color"
                                defaultValue={product?.color || ""}
                                placeholder="เช่น น้ำเงิน, ดำ"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                หมวดหมู่
                            </label>
                            <select
                                name="category"
                                defaultValue={product?.category || ""}
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-600 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors cursor-pointer"
                            >
                                <option value="">-- เลือกหมวดหมู่ --</option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Product Type & Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ประเภทสินค้า
                            </label>
                            <input
                                type="text"
                                name="producttype"
                                defaultValue={product?.producttype || ""}
                                placeholder="เช่น ยีนส์ขาเดฟ, ชิโน่"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ราคาขาย (บาท)
                            </label>
                            <input
                                type="number"
                                name="price"
                                defaultValue={product?.price ?? ""}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 mt-6">
                    <Link
                        href="/admin/products"
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        ยกเลิก
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm shadow-lg shadow-teal-200/50 hover:shadow-teal-300/50 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isPending ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
                    </button>
                </div>
            </form>
        </div>
    );
}
