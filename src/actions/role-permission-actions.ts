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
