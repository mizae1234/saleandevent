import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const customers = await db.customer.findMany({
            where: { status: 'active' },
            select: { id: true, code: true, name: true },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(customers);
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json([], { status: 500 });
    }
}
