import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const staff = await db.staff.findMany({
        where: { status: 'active' },
        select: {
            id: true,
            name: true,
            code: true,
            role: true,
        },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json(staff);
}
