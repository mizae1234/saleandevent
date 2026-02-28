import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/export
 * Returns all active products for Excel export.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'active' };

    if (q) {
        where.OR = [
            { barcode: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
        ];
    }

    if (category) {
        where.category = category;
    }

    const products = await db.product.findMany({
        where,
        include: {
            warehouseStock: { select: { quantity: true } },
        },
        orderBy: [{ name: 'asc' }, { size: 'asc' }],
    });

    const data = products.map((p) => ({
        barcode: p.barcode,
        code: p.code || '',
        name: p.name,
        size: p.size || '',
        color: p.color || '',
        category: p.category || '',
        price: Number(p.price || 0),
        stock: p.warehouseStock?.quantity ?? 0,
    }));

    return NextResponse.json(data);
}
