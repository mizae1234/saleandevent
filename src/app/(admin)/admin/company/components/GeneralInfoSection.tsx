"use client";

import { Building2, Hash, FileSpreadsheet } from "lucide-react";
import { FormInput } from "@/components/shared";

interface Props {
    name: string;
    setName: (val: string) => void;
    nameEn: string;
    setNameEn: (val: string) => void;
    taxId: string;
    setTaxId: (val: string) => void;
    branchName: string;
    setBranchName: (val: string) => void;
    branchCode: string;
    setBranchCode: (val: string) => void;
}

export function GeneralInfoSection({
    name,
    setName,
    nameEn,
    setNameEn,
    taxId,
    setTaxId,
    branchName,
    setBranchName,
    branchCode,
    setBranchCode,
}: Props) {
    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Building2 className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">ข้อมูลทั่วไปของร้านค้า / บริษัท</h2>
                    <p className="text-xs text-slate-500">ข้อมูลหลักสำหรับใช้อ้างอิงในเอกสารทางบัญชีและใบเสร็จรับเงิน</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                    label="ชื่อร้านค้า / บริษัท (ภาษาไทย) *"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น บริษัท สวยไม่ไหว 2020 จำกัด"
                    required
                />

                <FormInput
                    label="ชื่อร้านค้า / บริษัท (ภาษาอังกฤษ)"
                    name="nameEn"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="เช่น Suaymaiwhai 2020 Co., Ltd."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                    label="เลขประจำตัวผู้เสียภาษีอากร"
                    name="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="เลข 13 หลัก เช่น 0105563046582"
                    icon={FileSpreadsheet}
                />

                <FormInput
                    label="ชื่อสาขา"
                    name="branchName"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="เช่น สำนักงานใหญ่ หรือ สาขาสยาม"
                    icon={Building2}
                />

                <FormInput
                    label="รหัสสาขา"
                    name="branchCode"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="เช่น 00000"
                    icon={Hash}
                />
            </div>
        </div>
    );
}
