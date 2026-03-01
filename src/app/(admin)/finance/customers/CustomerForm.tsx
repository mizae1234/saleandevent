"use client";

import { ArrowLeft, Save } from "lucide-react";
import { Spinner, FormInput, FormTextarea, PageHeader } from "@/components/shared";
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
            <PageHeader
                back="/finance/customers"
                title={isEdit ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'}
            />

            <form action={handleSubmit}>
                <div className="bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 space-y-5">
                    {/* Row 1: Name */}
                    <FormInput
                        label="ชื่อลูกค้า *"
                        name="name"
                        defaultValue={customer?.name || ''}
                        required
                        placeholder="ชื่อบริษัท หรือ ชื่อบุคคล"
                    />

                    {/* Row 2: Tax ID + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormInput
                            label="เลขประจำตัวผู้เสียภาษี"
                            name="taxId"
                            defaultValue={customer?.taxId || ''}
                            placeholder="เช่น 0105563046582"
                        />
                        <FormInput
                            label="เบอร์โทร"
                            name="phone"
                            defaultValue={customer?.phone || ''}
                            placeholder="เช่น 02-xxx-xxxx"
                        />
                    </div>

                    {/* Row 3: Address */}
                    <FormTextarea
                        label="ที่อยู่"
                        name="address"
                        rows={3}
                        defaultValue={customer?.address || ''}
                        placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                    />

                    {/* Row 4: Credit Term + Reference No + Discount */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <FormInput
                            label="เครดิต (วัน)"
                            type="number"
                            onFocus={(e) => (e.target as HTMLInputElement).select()}
                            name="creditTerm"
                            min={0}
                            defaultValue={customer?.creditTerm ?? 0}
                            placeholder="0"
                        />
                        <FormInput
                            label="เลขที่อ้างอิง"
                            name="referenceNo"
                            defaultValue={customer?.referenceNo || ''}
                            placeholder="PO / เลขอ้างอิง"
                        />
                        <FormInput
                            label="ส่วนลด (%)"
                            type="number"
                            onFocus={(e) => (e.target as HTMLInputElement).select()}
                            name="discountPercent"
                            min={0}
                            max={100}
                            step={0.01}
                            defaultValue={customer?.discountPercent ?? 0}
                            placeholder="0"
                        />
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
