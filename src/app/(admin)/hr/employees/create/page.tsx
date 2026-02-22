import { createStaff } from "@/actions/staff-actions";
import { StaffForm } from "../StaffForm";
import { UserPlus } from "lucide-react";

export default function CreateEmployeePage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <UserPlus className="h-8 w-8 text-teal-600" />
                    เพิ่มพนักงานใหม่
                </h2>
                <p className="text-slate-500 mt-1">กรอกข้อมูลพนักงานเพื่อเพิ่มเข้าสู่ระบบ</p>
            </div>

            <StaffForm
                action={async (_prevState, formData) => {
                    "use server";
                    return await createStaff(formData);
                }}
            />
        </div>
    );
}
