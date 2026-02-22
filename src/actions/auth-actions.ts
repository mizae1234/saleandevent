'use server';

import { db } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, destroySession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

// ============ LOGIN (by employee code) ============

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
    const code = (formData.get('code') as string)?.toUpperCase().trim();
    const password = formData.get('password') as string;

    if (!code || !password) {
        return { error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' };
    }

    const staff = await db.staff.findFirst({
        where: {
            code,
            status: 'active',
        },
    });

    if (!staff || !staff.passwordHash) {
        return { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
    }

    const valid = await verifyPassword(password, staff.passwordHash);
    if (!valid) {
        return { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
    }

    await createSession({
        staffId: staff.id,
        role: staff.role,
        name: staff.name,
    });

    // Redirect based on role
    const adminRoles = ['ADMIN', 'MANAGER', 'WAREHOUSE', 'FINANCE'];
    if (adminRoles.includes(staff.role)) {
        redirect('/channels');
    } else {
        // STAFF, PC, etc → employee workspace
        redirect('/workspace');
    }
}

// ============ LOGOUT ============

export async function logoutAction() {
    await destroySession();
    redirect('/login');
}

// ============ CHANGE PASSWORD ============

export async function changePasswordAction(
    _prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData
) {
    const staffId = formData.get('staffId') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: 'กรุณากรอกข้อมูลให้ครบ' };
    }

    if (newPassword.length < 6) {
        return { error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' };
    }

    if (newPassword !== confirmPassword) {
        return { error: 'รหัสผ่านใหม่ไม่ตรงกัน' };
    }

    const staff = await db.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.passwordHash) {
        return { error: 'ไม่พบข้อมูลผู้ใช้' };
    }

    const valid = await verifyPassword(currentPassword, staff.passwordHash);
    if (!valid) {
        return { error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
    }

    const hash = await hashPassword(newPassword);
    await db.staff.update({
        where: { id: staffId },
        data: { passwordHash: hash },
    });

    return { success: true };
}

// ============ BACKFILL PASSWORDS FROM DOB ============

export async function backfillPasswordsFromDOB() {
    const staffList = await db.staff.findMany({
        where: {
            status: 'active',
            passwordHash: null,
            dateOfBirth: { not: null },
        },
    });

    const results: { name: string; code: string | null; password: string }[] = [];

    for (const s of staffList) {
        if (!s.dateOfBirth) continue;

        // Format DOB as ddMMyyyy (e.g. 15061995)
        const dobPassword = format(new Date(s.dateOfBirth), 'ddMMyyyy');
        const hash = await hashPassword(dobPassword);

        await db.staff.update({
            where: { id: s.id },
            data: { passwordHash: hash },
        });

        results.push({ name: s.name, code: s.code, password: dobPassword });
    }

    return { message: `Set passwords for ${results.length} staff`, results };
}
