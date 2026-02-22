"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

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
}

export function StaffForm({ initialData, action, isEdit = false }: StaffFormProps) {
    const [state, formAction, isPending] = useActionState(action, undefined);

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
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">รหัสพนักงาน</label>
                        <input
                            type="text"
                            value={initialData?.code || 'ระบบจะสร้างอัตโนมัติ (S0001)'}
                            disabled
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed"
                        />
                    </div>

                    {/* ชื่อ-สกุล */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ชื่อ-สกุล <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            defaultValue={initialData?.name || ''}
                            required
                            placeholder="กรอกชื่อ-นามสกุล"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>

                    {/* ประเภทพนักงาน */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทพนักงาน</label>
                        <select
                            name="employeeType"
                            defaultValue={initialData?.employeeType || ''}
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        >
                            <option value="">-- เลือก --</option>
                            <option value="fulltime">ประจำ</option>
                            <option value="parttime">พาร์ทไทม์</option>
                            <option value="temporary">ชั่วคราว</option>
                        </select>
                    </div>

                    {/* ตำแหน่ง */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ตำแหน่ง</label>
                        <input
                            type="text"
                            name="position"
                            defaultValue={initialData?.position || ''}
                            placeholder="เช่น พนักงานขาย, หัวหน้างาน"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">บทบาท</label>
                        <select
                            name="role"
                            defaultValue={initialData?.role || 'PC'}
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        >
                            <option value="PC">PC (พนักงานขาย)</option>
                            <option value="Supervisor">Supervisor (หัวหน้า)</option>
                            <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
                        </select>
                    </div>

                    {/* เบอร์โทร */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">เบอร์โทร</label>
                        <input
                            type="tel"
                            name="phone"
                            defaultValue={initialData?.phone || ''}
                            placeholder="0xx-xxx-xxxx"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>

                    {/* วันเกิด */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">วันเดือนปีเกิด</label>
                        <input
                            type="date"
                            name="dateOfBirth"
                            defaultValue={dateOfBirthValue}
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Section: ข้อมูลธนาคาร */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-100">ข้อมูลธนาคาร</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ธนาคาร */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ธนาคาร</label>
                        <select
                            name="bankName"
                            defaultValue={initialData?.bankName || ''}
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
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
                        </select>
                    </div>

                    {/* เลขบัญชี */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">เลขที่บัญชีธนาคาร</label>
                        <input
                            type="text"
                            name="bankAccountNo"
                            defaultValue={initialData?.bankAccountNo || ''}
                            placeholder="xxx-x-xxxxx-x"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Section: ค่าตอบแทน */}
            <div className="rounded-xl bg-white shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-3 border-b border-slate-100">ค่าตอบแทน</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ประเภทการจ่าย */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ประเภทการจ่าย</label>
                        <select
                            name="paymentType"
                            defaultValue={initialData?.paymentType || 'daily'}
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        >
                            <option value="daily">รายวัน</option>
                            <option value="monthly">รายเดือน</option>
                            <option value="commission">คอมมิชชั่น</option>
                        </select>
                    </div>

                    {/* ค่าแรงรายวัน */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">ค่าแรงรายวัน (บาท)</label>
                        <input
                            type="number"
                            name="dailyRate"
                            defaultValue={initialData?.dailyRate?.toString() || ''}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>

                    {/* คอมมิชชั่น */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">คอมมิชชั่น (บาท)</label>
                        <input
                            type="number"
                            name="commissionAmount"
                            defaultValue={initialData?.commissionAmount?.toString() || ''}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors"
                        />
                    </div>
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
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
