import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'saran-jeans-secret-key-change-in-production'
);

const COOKIE_NAME = 'sj-session';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api'];

// Admin-only route prefixes (the existing admin pages)
const ADMIN_ROUTE_PREFIXES = [
    '/channels',
    '/pc',
    '/warehouse',
    '/hr',
    '/finance',
    '/reports',
];

// Employee route prefixes
const EMPLOYEE_ROUTE_PREFIXES = [
    '/workspace',
    '/channel',
];

// Admin roles that can access admin routes
const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'WAREHOUSE', 'FINANCE'];

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

        // Admin route protection
        // Allow PC/STAFF to access /pc/* routes (Front Office functions)
        const isAdminRoute = ADMIN_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
        const isFrontOfficeRoute = pathname.startsWith('/pc');
        if (isAdminRoute && !isFrontOfficeRoute && !ADMIN_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/workspace', request.url));
        }
        if (isFrontOfficeRoute && !ADMIN_ROLES.includes(role) && !EMPLOYEE_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/workspace', request.url));
        }

        // Employee route protection
        const isEmployeeRoute = EMPLOYEE_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
        if (isEmployeeRoute && !EMPLOYEE_ROLES.includes(role)) {
            return NextResponse.redirect(new URL('/channels', request.url));
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
