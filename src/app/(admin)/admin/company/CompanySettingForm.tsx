"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Save, CheckCircle2, Clock } from "lucide-react";
import { updateCompanySetting, type CompanySettingData } from "@/actions/company-setting-actions";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/shared";

import { GeneralInfoSection } from "./components/GeneralInfoSection";
import { LogoUploadSection } from "./components/LogoUploadSection";
import { ContactInfoSection } from "./components/ContactInfoSection";
import { BankInfoSection } from "./components/BankInfoSection";
import { DocumentNoteSection } from "./components/DocumentNoteSection";

interface Props {
    initialData: CompanySettingData;
}

export function CompanySettingForm({ initialData }: Props) {
    const { toastError, toastSuccess } = useToast();
    const [isPending, startTransition] = useTransition();

    // Form fields state
    const [id] = useState(initialData.id || "");
    const [name, setName] = useState(initialData.name || "");
    const [nameEn, setNameEn] = useState(initialData.nameEn || "");
    const [taxId, setTaxId] = useState(initialData.taxId || "");
    const [branchName, setBranchName] = useState(initialData.branchName || "สำนักงานใหญ่");
    const [branchCode, setBranchCode] = useState(initialData.branchCode || "00000");
    const [address, setAddress] = useState(initialData.address || "");
    const [phone, setPhone] = useState(initialData.phone || "");
    const [email, setEmail] = useState(initialData.email || "");
    const [website, setWebsite] = useState(initialData.website || "");
    const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || "");
    const [bankName, setBankName] = useState(initialData.bankName || "");
    const [bankAccountNo, setBankAccountNo] = useState(initialData.bankAccountNo || "");
    const [bankAccountName, setBankAccountName] = useState(initialData.bankAccountName || "");
    const [footerNote, setFooterNote] = useState(initialData.footerNote || "");
    const [lastUpdated, setLastUpdated] = useState<Date>(initialData.updatedAt || new Date());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toastError("กรุณากรอกชื่อร้านค้าหรือชื่อบริษัท");
            return;
        }

        const formData = new FormData();
        formData.set("id", id);
        formData.set("name", name.trim());
        formData.set("nameEn", nameEn.trim());
        formData.set("taxId", taxId.trim());
        formData.set("branchName", branchName.trim());
        formData.set("branchCode", branchCode.trim());
        formData.set("address", address.trim());
        formData.set("phone", phone.trim());
        formData.set("email", email.trim());
        formData.set("website", website.trim());
        formData.set("logoUrl", logoUrl.trim());
        formData.set("bankName", bankName.trim());
        formData.set("bankAccountNo", bankAccountNo.trim());
        formData.set("bankAccountName", bankAccountName.trim());
        formData.set("footerNote", footerNote.trim());

        startTransition(async () => {
            try {
                const res = await updateCompanySetting(formData);
                if (res.error) {
                    toastError(res.error);
                } else {
                    toastSuccess("บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว");
                    setLastUpdated(new Date());
                }
            } catch (err: any) {
                toastError(err.message || "เกิดข้อผิดพลาดในการบันทึก");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-16">
            {/* Top Info Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                        อัปเดตล่าสุด:{" "}
                        <strong className="text-slate-700">
                            {format(new Date(lastUpdated), "d MMMM yyyy HH:mm น.", { locale: th })}
                        </strong>
                    </span>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                    {isPending ? (
                        <>
                            <Spinner size="sm" />
                            <span>กำลังบันทึก...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            <span>บันทึกข้อมูล</span>
                        </>
                    )}
                </button>
            </div>

            {/* Modular Form Sections */}
            <GeneralInfoSection
                name={name}
                setName={setName}
                nameEn={nameEn}
                setNameEn={setNameEn}
                taxId={taxId}
                setTaxId={setTaxId}
                branchName={branchName}
                setBranchName={setBranchName}
                branchCode={branchCode}
                setBranchCode={setBranchCode}
            />

            <LogoUploadSection
                logoUrl={logoUrl}
                setLogoUrl={setLogoUrl}
            />

            <ContactInfoSection
                address={address}
                setAddress={setAddress}
                phone={phone}
                setPhone={setPhone}
                email={email}
                setEmail={setEmail}
                website={website}
                setWebsite={setWebsite}
            />

            <BankInfoSection
                bankName={bankName}
                setBankName={setBankName}
                bankAccountNo={bankAccountNo}
                setBankAccountNo={setBankAccountNo}
                bankAccountName={bankAccountName}
                setBankAccountName={setBankAccountName}
            />

            <DocumentNoteSection
                footerNote={footerNote}
                setFooterNote={setFooterNote}
            />

            {/* Bottom Floating/Fixed Save Bar for Convenience */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                    {isPending ? (
                        <>
                            <Spinner size="sm" />
                            <span>กำลังบันทึก...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" />
                            <span>บันทึกข้อมูลทั้งหมด</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
