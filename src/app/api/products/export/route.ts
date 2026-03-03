import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/products/export
 * Returns all active products for Excel export.
 * ?sample=true → returns 1 product per producttype (for template)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const sample = searchParams.get('sample') === 'true';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'active' };

    if (!sample) {
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
    }

    let products;

    if (sample) {
        // Get distinct product types then 1 sample each
        const types = await db.product.findMany({
            where: { status: 'active' },
            select: { producttype: true },
            distinct: ['producttype'],
        });

        const samples = [];
        for (const t of types) {
            const p = await db.product.findFirst({
                where: { status: 'active', producttype: t.producttype },
                include: { warehouseStock: { select: { quantity: true } } },
            });
            if (p) samples.push(p);
        }
        products = samples;
    } else {
        products = await db.product.findMany({
            where,
            include: {
                warehouseStock: { select: { quantity: true } },
            },
            orderBy: [{ name: 'asc' }, { size: 'asc' }],
        });
    }

    const data = products.map((p) => ({
        barcode: p.barcode,
        code: p.code || '',
        name: p.name,
        size: p.size || '',
        color: p.color || '',
        category: p.category || '',
        producttype: p.producttype || '',
        price: Number(p.price || 0),
        stock: p.warehouseStock?.quantity ?? 0,
    }));

    return NextResponse.json(data);
}
