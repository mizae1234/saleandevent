import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        // Build WHERE clause based on category filter
        let whereClause = `WHERE status = 'active' AND (category IS NULL OR category NOT IN ('Display', 'Supplies', 'อุปกรณ์'))`;
        if (category && category !== 'ทั้งหมด') {
            whereClause = `WHERE status = 'active' AND category = '${category}'`;
        }

        // Use raw SQL to bypass stale Prisma client type issues
        // Cast price to FLOAT to avoid Decimal serialization issues
        const products = await db.$queryRawUnsafe<Array<{
            barcode: string;
            name: string;
            size: string | null;
            price: number | null;
            category: string | null;
            code: string | null;
            color: string | null;
        }>>(`
            SELECT barcode, name, size, CAST(price AS FLOAT) as price, category, code, color 
            FROM products 
            ${whereClause}
            ORDER BY name ASC, size ASC
        `);

        // Map to plain objects to ensure serialization
        const result = products.map(p => ({
            barcode: p.barcode,
            name: p.name,
            size: p.size,
            price: p.price ? Number(p.price) : 0,
            category: p.category,
            code: p.code,
            color: p.color
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}
