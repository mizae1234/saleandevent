"use client";

import { useActionState } from "react";
import { createProduct, updateProduct } from "@/actions/product-actions";
import { ArrowLeft, Save } from "lucide-react";
import { Spinner, FormInput, FormSelect, PageHeader } from "@/components/shared";
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
            <PageHeader
                back="/admin/products"
                title={isEdit ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                subtitle={isEdit ? `แก้ไขข้อมูลสินค้า ${product?.name}` : "กรอกข้อมูลสินค้าที่ต้องการเพิ่ม"}
            />

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
                        <FormInput
                            label="บาร์โค้ด *"
                            name="barcode"
                            defaultValue={product?.barcode || ""}
                            readOnly={isEdit}
                            required
                            placeholder="สแกนหรือกรอกบาร์โค้ด"
                            disabled={isEdit}
                        />
                        {isEdit && (
                            <p className="text-xs text-slate-400 mt-1">บาร์โค้ดไม่สามารถแก้ไขได้</p>
                        )}
                    </div>

                    {/* Code & Name row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="รหัสสินค้า"
                            name="code"
                            defaultValue={product?.code || ""}
                            placeholder="เช่น P001"
                        />
                        <FormInput
                            label="ชื่อสินค้า *"
                            name="name"
                            defaultValue={product?.name || ""}
                            required
                            placeholder="ชื่อสินค้า"
                        />
                    </div>

                    {/* Size, Color, Category */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormInput
                            label="ไซส์"
                            name="size"
                            defaultValue={product?.size || ""}
                            placeholder="เช่น 28, 30, M, L"
                        />
                        <FormInput
                            label="สี"
                            name="color"
                            defaultValue={product?.color || ""}
                            placeholder="เช่น น้ำเงิน, ดำ"
                        />
                        <FormSelect
                            label="หมวดหมู่"
                            name="category"
                            defaultValue={product?.category || ""}
                        >
                            <option value="">-- เลือกหมวดหมู่ --</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </FormSelect>
                    </div>

                    {/* Product Type & Price */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="ประเภทสินค้า"
                            name="producttype"
                            defaultValue={product?.producttype || ""}
                            placeholder="เช่น ยีนส์ขาเดฟ, ชิโน่"
                        />
                        <FormInput
                            label="ราคาขาย (บาท)"
                            type="number"
                            name="price"
                            defaultValue={product?.price ?? ""}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                        />
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
                            <Spinner size="sm" />
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
