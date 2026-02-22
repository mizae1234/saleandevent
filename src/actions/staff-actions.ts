'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============ Helper: Auto-generate Staff Code ============

async function generateStaffCode(): Promise<string> {
    const lastStaff = await db.staff.findFirst({
        where: {
            code: { not: null, startsWith: 'S' }
        },
        orderBy: { code: 'desc' },
        select: { code: true }
    });

    if (!lastStaff?.code) {
        return 'S0001';
    }

    const lastNumber = parseInt(lastStaff.code.replace('S', ''), 10);
    const nextNumber = lastNumber + 1;
    return `S${nextNumber.toString().padStart(4, '0')}`;
}

// ============ CREATE ============

export async function createStaff(formData: FormData) {
    try {
        const code = await generateStaffCode();

        const name = formData.get('name') as string;
        const employeeType = formData.get('employeeType') as string | null;
        const position = formData.get('position') as string | null;
        const role = formData.get('role') as string || 'PC';
        const phone = formData.get('phone') as string | null;
        const dateOfBirthStr = formData.get('dateOfBirth') as string | null;
        const bankAccountNo = formData.get('bankAccountNo') as string | null;
        const bankName = formData.get('bankName') as string | null;
        const paymentType = formData.get('paymentType') as string || 'daily';
        const dailyRateStr = formData.get('dailyRate') as string | null;
        const commissionAmountStr = formData.get('commissionAmount') as string | null;

        if (!name) {
            return { error: 'กรุณากรอกชื่อ-สกุล' };
        }

        await db.staff.create({
            data: {
                code,
                name,
                employeeType: employeeType || null,
                position: position || null,
                role,
                phone: phone || null,
                dateOfBirth: dateOfBirthStr ? new Date(dateOfBirthStr) : null,
                bankAccountNo: bankAccountNo || null,
                bankName: bankName || null,
                paymentType,
                dailyRate: dailyRateStr ? parseFloat(dailyRateStr) : null,
                commissionAmount: commissionAmountStr ? parseFloat(commissionAmountStr) : null,
            }
        });
    } catch (error) {
        console.error("Failed to create staff:", error);
        return { error: 'เกิดข้อผิดพลาดในการสร้างข้อมูลพนักงาน' };
    }

    revalidatePath('/hr/employees');
    redirect('/hr/employees');
}

// ============ UPDATE ============

export async function updateStaff(id: string, formData: FormData) {
    try {
        const name = formData.get('name') as string;
        const employeeType = formData.get('employeeType') as string | null;
        const position = formData.get('position') as string | null;
        const role = formData.get('role') as string || 'PC';
        const phone = formData.get('phone') as string | null;
        const dateOfBirthStr = formData.get('dateOfBirth') as string | null;
        const bankAccountNo = formData.get('bankAccountNo') as string | null;
        const bankName = formData.get('bankName') as string | null;
        const paymentType = formData.get('paymentType') as string || 'daily';
        const dailyRateStr = formData.get('dailyRate') as string | null;
        const commissionAmountStr = formData.get('commissionAmount') as string | null;

        if (!name) {
            return { error: 'กรุณากรอกชื่อ-สกุล' };
        }

        await db.staff.update({
            where: { id },
            data: {
                name,
                employeeType: employeeType || null,
                position: position || null,
                role,
                phone: phone || null,
                dateOfBirth: dateOfBirthStr ? new Date(dateOfBirthStr) : null,
                bankAccountNo: bankAccountNo || null,
                bankName: bankName || null,
                paymentType,
                dailyRate: dailyRateStr ? parseFloat(dailyRateStr) : null,
                commissionAmount: commissionAmountStr ? parseFloat(commissionAmountStr) : null,
            }
        });
    } catch (error) {
        console.error("Failed to update staff:", error);
        return { error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลพนักงาน' };
    }

    revalidatePath('/hr/employees');
    redirect('/hr/employees');
}

// ============ DELETE (Soft) ============

export async function deleteStaff(id: string) {
    try {
        await db.staff.update({
            where: { id },
            data: { status: 'inactive' }
        });
    } catch (error) {
        console.error("Failed to delete staff:", error);
        return { error: 'เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน' };
    }

    revalidatePath('/hr/employees');
}

// ============ BACKFILL existing staff codes ============

export async function backfillStaffCodes() {
    const staffWithoutCode = await db.staff.findMany({
        where: { code: null },
        orderBy: { createdAt: 'asc' }
    });

    for (let i = 0; i < staffWithoutCode.length; i++) {
        const code = await generateStaffCode();
        await db.staff.update({
            where: { id: staffWithoutCode[i].id },
            data: { code }
        });
    }

    return { count: staffWithoutCode.length };
}
