import { getSession } from "@/lib/auth";
import { getCompanySetting } from "@/actions/company-setting-actions";
import { PageHeader } from "@/components/shared";
import { Building2, ShieldAlert } from "lucide-react";
import { CompanySettingForm } from "./CompanySettingForm";
import Link from "next/link";

export const metadata = {
    title: "ข้อมูลร้านค้า / บริษัท | ระบบจัดการร้านค้า",
    description: "ตั้งค่าข้อมูลร้านค้า บริษัท เลขประจำตัวผู้เสียภาษี ที่อยู่ และโลโก้",
};

export default async function CompanySettingPage() {
    const session = await getSession();
    const role = session?.role;
    const allowedMenus = session?.allowedMenus || [];

    // Check permission: ADMIN or having 'system_admin' or '/admin/company' in allowedMenus
    const hasAccess =
        role === "ADMIN" ||
        allowedMenus.includes("system_admin") ||
        allowedMenus.includes("/admin/company");

    if (!hasAccess) {
        return (
            <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="text-lg font-bold text-slate-800">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
                <p className="text-xs text-slate-500">
                    คุณไม่มีสิทธิ์ในการเข้าถึงหน้าตั้งค่าข้อมูลร้านค้า / บริษัท หากจำเป็นต้องใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์
                </p>
                <div className="pt-2">
                    <Link
                        href="/"
                        className="inline-flex px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    >
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        );
    }

    const companyData = await getCompanySetting();

    return (
        <div className="space-y-6">
            <PageHeader
                title="ข้อมูลร้านค้า / บริษัท"
                subtitle="จัดการข้อมูลร้านค้า เลขประจำตัวผู้เสียภาษี ที่อยู่ โลโก้ และข้อความท้ายบิล สำหรับใช้ในเอกสารทุกจุด"
                icon={Building2}
            />

            <CompanySettingForm initialData={companyData} />
        </div>
    );
}
