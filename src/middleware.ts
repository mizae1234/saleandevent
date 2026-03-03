import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'saran-jeans-secret-key-change-in-production'
);

const COOKIE_NAME = 'sj-session';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api'];

// Route prefix to menu key mapping (must match ROUTE_TO_MENU_KEY in menu.ts)
const ROUTE_TO_MENU_KEY: Record<string, string> = {
    '/pc': 'front_office',
    '/channels': 'sales_channel',
    '/warehouse': 'supply_chain',
    '/finance': 'finance',
    '/hr': 'hr',
    '/reports': 'finance',
    '/dashboard': 'finance',
    '/admin': 'system_admin',
};

// Admin roles that can access admin routes (fallback when no allowedMenus)
const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'WAREHOUSE', 'FINANCE'];

// Employee route prefixes
const EMPLOYEE_ROUTE_PREFIXES = [
    '/workspace',
    '/channel',
];

// Employee roles that can access employee routes
const EMPLOYEE_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'PC'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes and API routes
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Get session token
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify JWT
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;
        const allowedMenus = (payload.allowedMenus as string[] | undefined) || [];

        // Employee route protection
        const isEmployeeRoute = EMPLOYEE_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
        if (isEmployeeRoute && !EMPLOYEE_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/dashboard/owner', request.url));
        }

        // If it's an employee route, allow it
        if (isEmployeeRoute) {
            return NextResponse.next();
        }

        // Admin route protection via allowedMenus
        if (allowedMenus.length > 0) {
            // Check if user has a specific item-level path (e.g., "/hr/employees")
            const hasItemAccess = allowedMenus.some(m => m.startsWith('/') && pathname.startsWith(m));

            if (!hasItemAccess) {
                // Check section-level access
                const matchedPrefix = Object.keys(ROUTE_TO_MENU_KEY).find(prefix =>
                    pathname.startsWith(prefix)
                );

                if (matchedPrefix) {
                    const menuKey = ROUTE_TO_MENU_KEY[matchedPrefix];
                    if (!allowedMenus.includes(menuKey)) {
                        // User doesn't have access to this menu section
                        const firstAllowedPrefix = Object.entries(ROUTE_TO_MENU_KEY)
                            .find(([_, key]) => allowedMenus.includes(key));
                        const redirectTo = firstAllowedPrefix ? firstAllowedPrefix[0] : '/workspace';
                        return NextResponse.redirect(new URL(redirectTo, request.url));
                    }
                }
            }
        } else {
            // Fallback: old role-based protection (no allowedMenus configured yet)
            const isFrontOfficeRoute = pathname.startsWith('/pc');
            const isAdminRoute = Object.keys(ROUTE_TO_MENU_KEY).some(prefix => pathname.startsWith(prefix));

            if (isAdminRoute && !isFrontOfficeRoute && !ADMIN_ROLES.includes(role)) {
                return NextResponse.redirect(new URL('/workspace', request.url));
            }
            if (isFrontOfficeRoute && !ADMIN_ROLES.includes(role) && !EMPLOYEE_ROLES.includes(role)) {
                return NextResponse.redirect(new URL('/workspace', request.url));
            }
        }

        return NextResponse.next();
    } catch {
        // Invalid token — redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete(COOKIE_NAME);
        return response;
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

