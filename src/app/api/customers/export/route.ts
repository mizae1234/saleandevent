import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const customers = await db.customer.findMany({
        where: { status: "active" },
        orderBy: { code: "asc" },
    });

    return NextResponse.json(customers);
}
