"use client";

import { ArrowLeft, Save } from "lucide-react";
import { Spinner } from "@/components/shared";
import Link from "next/link";
import { useTransition } from "react";
import { createCustomer, updateCustomer } from "@/actions/customer-actions";

interface CustomerData {
    id?: string;
    code: string;
    taxId: string | null;
    name: string;
    address: string | null;
    phone: string | null;
    creditTerm: number | null;
    referenceNo: string | null;
    discountPercent: number | null;
}

export function CustomerForm({ customer, isEdit }: { customer?: CustomerData; isEdit?: boolean }) {
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            if (isEdit && customer?.id) {
                await updateCustomer(customer.id, formData);
            } else {
                await createCustomer(formData);
            }
        });
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    href="/finance/customers"
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}
                </h1>
            </div>

            <form action={handleSubmit}>
                <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 space-y-5">
                    {/* Row 1: Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            ชื่อลูกค้า <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={customer?.name || ''}
                            required
                            placeholder="ชื่อบริษัท หรือ ชื่อบุคคล"
                            className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                        />
                    </div>

                    {/* Row 2: Tax ID + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                เลขประจำตัวผู้เสียภาษี
                            </label>
                            <input
                                type="text"
                                name="taxId"
                                defaultValue={customer?.taxId || ''}
                                placeholder="เช่น 0105563046582"
                                className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                เบอร์โทร
                            </label>
                            <input
                                type="text"
                                name="phone"
                                defaultValue={customer?.phone || ''}
                                placeholder="เช่น 02-xxx-xxxx"
                                className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                            />
                        </div>
                    </div>

                    {/* Row 3: Address */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            ที่อยู่
                        </label>
                        <textarea
                            name="address"
                            rows={3}
                            defaultValue={customer?.address || ''}
                            placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                            className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors resize-none"
                        />
                    </div>

                    {/* Row 4: Credit Term + Reference No + Discount */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                เครดิต (วัน)
                            </label>
                            <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                name="creditTerm"
                                min={0}
                                defaultValue={customer?.creditTerm ?? 0}
                                placeholder="0"
                                className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                เลขที่อ้างอิง
                            </label>
                            <input
                                type="text"
                                name="referenceNo"
                                defaultValue={customer?.referenceNo || ''}
                                placeholder="PO / เลขอ้างอิง"
                                className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                ส่วนลด (%)
                            </label>
                            <input
                                type="number"
                                onFocus={(e) => e.target.select()}
                                name="discountPercent"
                                min={0}
                                max={100}
                                step={0.01}
                                defaultValue={customer?.discountPercent ?? 0}
                                placeholder="0"
                                className="w-full px-3 py-2.5 border-0 border-b-2 border-slate-200 text-sm focus:outline-none focus:border-teal-500 bg-slate-50/50 rounded-t-lg transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end mt-6">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isPending ? (
                            <Spinner size="sm" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้า'}
                    </button>
                </div>
            </form>
        </div>
    );
}
