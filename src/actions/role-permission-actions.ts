'use server';

import { db } from '@/lib/db';
import { MENU_SECTIONS } from '@/config/menu';
import { revalidatePath } from 'next/cache';

// ============ GET ALL ROLE PERMISSIONS ============

export async function getRolePermissions() {
    return db.rolePermission.findMany({
        orderBy: { role: 'asc' },
    });
}

// ============ GET PERMISSION BY ROLE ============

export async function getRolePermission(role: string) {
    return db.rolePermission.findUnique({
        where: { role },
    });
}

// ============ GET ALLOWED MENUS FOR ROLE ============

export async function getAllowedMenusForRole(role: string): Promise<string[]> {
    const perm = await db.rolePermission.findUnique({
        where: { role },
    });

    if (!perm) {
        // If no config exists, ADMIN gets all menus, others get nothing
        if (role === 'ADMIN') {
            return MENU_SECTIONS.map((s) => s.key);
        }
        return [];
    }

    return perm.allowedMenus as string[];
}

// ============ SAVE ROLE PERMISSIONS (upsert) ============

export async function saveRolePermissions(
    _prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData
) {
    try {
        const rolesJson = formData.get('roles') as string;
        if (!rolesJson) {
            return { error: 'ไม่พบข้อมูล' };
        }

        const rolePermissions: { role: string; allowedMenus: string[] }[] = JSON.parse(rolesJson);

        // Upsert each role permission
        for (const rp of rolePermissions) {
            await db.rolePermission.upsert({
                where: { role: rp.role },
                create: {
                    role: rp.role,
                    allowedMenus: rp.allowedMenus,
                },
                update: {
                    allowedMenus: rp.allowedMenus,
                },
            });
        }

        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        console.error('saveRolePermissions error:', e);
        return { error: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
}

// ============ GET STAFF LIST FOR PERMISSION MANAGEMENT ============

export async function getStaffForPermissions() {
    const staff = await db.staff.findMany({
        where: { status: 'active' },
        select: {
            id: true,
            code: true,
            name: true,
            role: true,
            allowedMenus: true,
            salaryAccess: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
    return staff.map(s => ({
        ...s,
        allowedMenus: s.allowedMenus as string[] | null,
    }));
}

// ============ SAVE PER-STAFF PERMISSIONS ============

export async function saveStaffPermissions(
    staffId: string,
    allowedMenus: string[] | null,
    salaryAccess: string | null,
) {
    try {
        const { Prisma } = await import('@prisma/client');
        await db.staff.update({
            where: { id: staffId },
            data: {
                allowedMenus: allowedMenus && allowedMenus.length > 0 ? allowedMenus : Prisma.JsonNull,
                salaryAccess: salaryAccess || null,
            },
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (e) {
        console.error('saveStaffPermissions error:', e);
        return { error: 'เกิดข้อผิดพลาดในการบันทึก' };
    }
}
