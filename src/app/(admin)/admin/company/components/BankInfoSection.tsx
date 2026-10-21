"use client";

import { CreditCard, Landmark, UserCheck } from "lucide-react";
import { FormInput } from "@/components/shared";

interface Props {
    bankName: string;
    setBankName: (val: string) => void;
    bankAccountNo: string;
    setBankAccountNo: (val: string) => void;
    bankAccountName: string;
    setBankAccountName: (val: string) => void;
}

export function BankInfoSection({
    bankName,
    setBankName,
    bankAccountNo,
    setBankAccountNo,
    bankAccountName,
    setBankAccountName,
}: Props) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CreditCard className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">บัญชีธนาคารสำหรับรับชำระเงิน</h2>
                    <p className="text-xs text-slate-500">ข้อมูลบัญชีสำหรับการโอนเงินชำระค่าสินค้าหรือออกเอกสารใบแจ้งหนี้</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                    label="ชื่อธนาคาร"
                    name="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                    icon={Landmark}
                />

                <FormInput
                    label="เลขที่บัญชี"
                    name="bankAccountNo"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    placeholder="xxx-x-xxxxx-x"
                    icon={CreditCard}
                />

                <FormInput
                    label="ชื่อบัญชี"
                    name="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="เช่น บจก. สวยไม่ไหว 2020"
                    icon={UserCheck}
                />
            </div>
        </div>
    );
}
