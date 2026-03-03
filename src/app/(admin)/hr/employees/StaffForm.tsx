"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { FormInput, FormSelect, Spinner } from "@/components/shared";

interface StaffData {
    id?: string;
    code?: string | null;
    name: string;
    employeeType?: string | null;
    position?: string | null;
    role: string;
    phone?: string | null;
    dateOfBirth?: Date | string | null;
    bankAccountNo?: string | null;
    bankName?: string | null;
    paymentType: string;
    dailyRate?: number | null;
    commissionAmount?: number | null;
}

interface StaffFormProps {
    initialData?: StaffData;
    action: (prevState: { error?: string } | undefined, formData: FormData) => Promise<{ error?: string } | undefined>;
    isEdit?: boolean;
    salaryAccess?: string | null; // none, daily, monthly, all
}

export function StaffForm({ initialData, action, isEdit = false, salaryAccess }: StaffFormProps) {
    const [state, formAction, isPending] = useActionState(action, undefined);

    // Check if current user can view salary for this staff's payment type
    const staffPaymentType = initialData?.paymentType || 'daily';
    const canViewSalary = () => {
        if (!salaryAccess || salaryAccess === 'none') return false;
        if (salaryAccess === 'all') return true;
        return salaryAccess === staffPaymentType;
    };
    const hideSalary = isEdit && !canViewSalary();

    const dateOfBirthValue = initialData?.dateOfBirth
        ? (typeof initialData.dateOfBirth === 'string'
            ? initialData.dateOfBirth.split('T')[0]
            : new Date(initialData.dateOfBirth).toISOString().split('T')[0])
        : '';

    return (
        <form action={formAction} className="space-y-8">
            {/* Error */}
            {state?.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            {/* Section: ข้อมูลทั่วไป */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-100">ข้อมูลทั่วไป</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* รหัสพนักงาน */}
                    <FormInput
                        label="รหัสพนักงาน"
                        value={initialData?.code || 'ระบบจะสร้างอัตโนมัติ (S0001)'}
                        disabled
                    />

                    {/* ชื่อ-สกุล */}
                    <FormInput
                        label="ชื่อ-สกุล *"
                        name="name"
                        defaultValue={initialData?.name || ''}
                        required
                        placeholder="กรอกชื่อ-นามสกุล"
                    />

                    {/* ประเภทพนักงาน */}
                    <FormSelect
                        label="ประเภทพนักงาน"
                        name="employeeType"
                        defaultValue={initialData?.employeeType || ''}
                    >
                        <option value="">-- เลือก --</option>
                        <option value="fulltime">ประจำ</option>
                        <option value="parttime">พาร์ทไทม์</option>
                        <option value="temporary">ชั่วคราว</option>
                    </FormSelect>

                    {/* ตำแหน่ง */}
                    <FormInput
                        label="ตำแหน่ง"
                        name="position"
                        defaultValue={initialData?.position || ''}
                        placeholder="เช่น พนักงานขาย, หัวหน้างาน"
                    />

                    {/* Role */}
                    <FormSelect
                        label="บทบาท"
                        name="role"
                        defaultValue={initialData?.role || 'PC'}
                    >
                        <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                        <option value="MANAGER">MANAGER (ผู้จัดการ)</option>
                        <option value="FINANCE">FINANCE (บัญชี)</option>
                        <option value="HR">HR (บุคคล)</option>
                        <option value="WAREHOUSE">WAREHOUSE (คลังสินค้า)</option>
                        <option value="PC">PC (พนักงานขาย)</option>
                        <option value="STAFF">STAFF (พนักงานทั่วไป)</option>
                    </FormSelect>

                    {/* เบอร์โทร */}
                    <FormInput
                        label="เบอร์โทร"
                        type="tel"
                        name="phone"
                        defaultValue={initialData?.phone || ''}
                        placeholder="0xx-xxx-xxxx"
                    />

                    {/* วันเกิด */}
                    <FormInput
                        label="วันเดือนปีเกิด"
                        type="date"
                        name="dateOfBirth"
                        defaultValue={dateOfBirthValue}
                    />
                </div>
            </div>

            {/* Section: ข้อมูลธนาคาร */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-100">ข้อมูลธนาคาร</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ธนาคาร */}
                    <FormSelect
                        label="ธนาคาร"
                        name="bankName"
                        defaultValue={initialData?.bankName || ''}
                    >
                        <option value="">-- เลือก --</option>
                        <option value="กรุงเทพ">ธ.กรุงเทพ</option>
                        <option value="กสิกรไทย">ธ.กสิกรไทย</option>
                        <option value="ไทยพาณิชย์">ธ.ไทยพาณิชย์</option>
                        <option value="กรุงไทย">ธ.กรุงไทย</option>
                        <option value="กรุงศรีอยุธยา">ธ.กรุงศรีอยุธยา</option>
                        <option value="ทหารไทยธนชาต">ธ.ทหารไทยธนชาต (ttb)</option>
                        <option value="ออมสิน">ธ.ออมสิน</option>
                        <option value="ธ.ก.ส.">ธ.ก.ส.</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                    </FormSelect>

                    {/* เลขบัญชี */}
                    <FormInput
                        label="เลขที่บัญชีธนาคาร"
                        name="bankAccountNo"
                        defaultValue={initialData?.bankAccountNo || ''}
                        placeholder="xxx-x-xxxxx-x"
                    />
                </div>
            </div>

            {/* Section: ค่าตอบแทน */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-100">ค่าตอบแทน</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ประเภทการจ่าย */}
                    <FormSelect
                        label="ประเภทการจ่าย"
                        name="paymentType"
                        defaultValue={initialData?.paymentType || 'daily'}
                    >
                        <option value="daily">รายวัน</option>
                        <option value="monthly">รายเดือน</option>
                        <option value="commission">คอมมิชชั่น</option>
                    </FormSelect>

                    {/* ค่าแรงรายวัน */}
                    {hideSalary ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">ค่าแรง(บาท)</label>
                            <div className="h-10 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono">***</div>
                        </div>
                    ) : (
                        <FormInput
                            label="ค่าแรง(บาท)"
                            type="number"
                            onFocus={(e) => (e.target as HTMLInputElement).select()}
                            name="dailyRate"
                            defaultValue={initialData?.dailyRate?.toString() || ''}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    )}

                    {/* คอมมิชชั่น */}
                    {hideSalary ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">คอมมิชชั่น (บาท)</label>
                            <div className="h-10 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-mono">***</div>
                        </div>
                    ) : (
                        <FormInput
                            label="คอมมิชชั่น (บาท)"
                            type="number"
                            onFocus={(e) => (e.target as HTMLInputElement).select()}
                            name="commissionAmount"
                            defaultValue={initialData?.commissionAmount?.toString() || ''}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    )}
                </div>
            </div>



            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
                <Link href="/hr/employees">
                    <Button type="button" variant="ghost" className="text-slate-600">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        กลับ
                    </Button>
                </Link>
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white min-w-[140px]"
                >
                    {isPending ? (
                        <div className="flex items-center gap-2">
                            <Spinner size="sm" />
                            กำลังบันทึก...
                        </div>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {isEdit ? 'บันทึกการแก้ไข' : 'สร้างพนักงาน'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
