import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const staff = await db.staff.findMany({
            where: { status: 'active' },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, role: true, phone: true }
        });

        return NextResponse.json(staff);
    } catch (error) {
        console.error("Failed to fetch staff:", error);
        return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
    }
}
