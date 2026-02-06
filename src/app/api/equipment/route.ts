import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Use raw SQL to bypass stale Prisma client type issues
        // Cast price to FLOAT to avoid Decimal serialization issues
        const equipment = await db.$queryRaw<Array<{
            barcode: string;
            name: string;
            size: string | null;
            price: number | null;
            category: string | null;
            code: string | null;
            color: string | null;
        }>>`
            SELECT barcode, name, size, CAST(price AS FLOAT) as price, category, code, color 
            FROM products 
            WHERE status = 'active' 
              AND category IN ('Display', 'Supplies', 'อุปกรณ์')
            ORDER BY name ASC
        `;

        // Map to plain objects to ensure serialization
        const result = equipment.map(e => ({
            barcode: e.barcode,
            name: e.name,
            size: e.size,
            price: e.price ? Number(e.price) : 0,
            category: e.category,
            code: e.code,
            color: e.color
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch equipment:", error);
        return NextResponse.json({ error: "Failed to fetch equipment" }, { status: 500 });
    }
}
