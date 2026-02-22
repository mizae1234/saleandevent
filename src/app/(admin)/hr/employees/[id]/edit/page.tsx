import { db } from "@/lib/db";
import { updateStaff } from "@/actions/staff-actions";
import { StaffForm } from "../../StaffForm";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const staff = await db.staff.findUnique({
        where: { id },
    });

    if (!staff) {
        notFound();
    }

    const staffData = {
        id: staff.id,
        code: staff.code,
        name: staff.name,
        employeeType: staff.employeeType,
        position: staff.position,
        role: staff.role,
        phone: staff.phone,
        dateOfBirth: staff.dateOfBirth,
        bankAccountNo: staff.bankAccountNo,
        bankName: staff.bankName,
        paymentType: staff.paymentType,
        dailyRate: staff.dailyRate ? Number(staff.dailyRate) : null,
        commissionAmount: staff.commissionAmount ? Number(staff.commissionAmount) : null,
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    <Pencil className="h-8 w-8 text-teal-600" />
                    แก้ไขข้อมูลพนักงาน
                </h2>
                <p className="text-slate-500 mt-1">
                    รหัส: <span className="font-mono text-teal-600 font-medium">{staff.code || '-'}</span> — {staff.name}
                </p>
            </div>

            <StaffForm
                initialData={staffData}
                isEdit
                action={async (_prevState, formData) => {
                    "use server";
                    return await updateStaff(id, formData);
                }}
            />
        </div>
    );
}
