import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MENU_SECTIONS } from '@/config/menu';

// GET /api/admin/seed-permissions — Seed default role permissions
export async function GET() {
    try {
        const allMenuKeys = MENU_SECTIONS.map((s) => s.key);

        // ADMIN gets all menus
        await db.rolePermission.upsert({
            where: { role: 'ADMIN' },
            create: {
                role: 'ADMIN',
                allowedMenus: allMenuKeys,
            },
            update: {
                allowedMenus: allMenuKeys,
            },
        });

        // MANAGER gets all menus
        await db.rolePermission.upsert({
            where: { role: 'MANAGER' },
            create: {
                role: 'MANAGER',
                allowedMenus: allMenuKeys,
            },
            update: {},
        });

        // WAREHOUSE gets supply chain + front office
        await db.rolePermission.upsert({
            where: { role: 'WAREHOUSE' },
            create: {
                role: 'WAREHOUSE',
                allowedMenus: ['front_office', 'supply_chain'],
            },
            update: {},
        });

        // FINANCE gets finance_hr
        await db.rolePermission.upsert({
            where: { role: 'FINANCE' },
            create: {
                role: 'FINANCE',
                allowedMenus: ['finance_hr', 'sales_channel'],
            },
            update: {},
        });

        // STAFF gets front_office only
        await db.rolePermission.upsert({
            where: { role: 'STAFF' },
            create: {
                role: 'STAFF',
                allowedMenus: ['front_office'],
            },
            update: {},
        });

        // PC gets front_office only
        await db.rolePermission.upsert({
            where: { role: 'PC' },
            create: {
                role: 'PC',
                allowedMenus: ['front_office'],
            },
            update: {},
        });

        const all = await db.rolePermission.findMany({ orderBy: { role: 'asc' } });

        return NextResponse.json({
            message: 'Seeded role permissions',
            permissions: all,
        });
    } catch (error) {
        console.error('Seed permissions error:', error);
        return NextResponse.json(
            { error: 'Failed to seed permissions' },
            { status: 500 }
        );
    }
}
