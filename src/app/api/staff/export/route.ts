import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const staffList = await db.staff.findMany({
        where: { status: "active" },
        orderBy: { code: "asc" },
    });

    return NextResponse.json(staffList);
}
