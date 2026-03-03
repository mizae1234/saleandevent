import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    const salaryAccess = session?.salaryAccess || null;

    // Helper: can the current user view salary for a given paymentType?
    const canView = (paymentType: string) => {
        if (!salaryAccess || salaryAccess === 'none') return false;
        if (salaryAccess === 'all') return true;
        return salaryAccess === paymentType;
    };

    const staffList = await db.staff.findMany({
        where: { status: "active" },
        orderBy: { code: "asc" },
        select: {
            code: true,
            name: true,
            position: true,
            role: true,
            paymentType: true,
            dailyRate: true,
            commissionAmount: true,
            dateOfBirth: true,
            email: true,
            phone: true,
            bankName: true,
            bankAccountNo: true,
        },
    });

    // Mask salary fields based on access — use "***" string for masked, keep original for permitted
    const masked = staffList.map(s => ({
        ...s,
        dailyRate: canView(s.paymentType) ? s.dailyRate : '***',
        commissionAmount: canView(s.paymentType) ? s.commissionAmount : '***',
    }));

    return NextResponse.json(masked);
}
