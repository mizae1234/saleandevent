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
    });

    // Mask salary fields based on access
    const masked = staffList.map(s => ({
        ...s,
        dailyRate: canView(s.paymentType) ? s.dailyRate : null,
        commissionAmount: canView(s.paymentType) ? s.commissionAmount : null,
    }));

    return NextResponse.json(masked);
}
