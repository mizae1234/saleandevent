import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/products/import
 * Accepts JSON array of product rows. Only creates NEW products (skips existing barcodes).
 */
export async function POST(request: Request) {
    try {
        const rows = await request.json();

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลสินค้า' }, { status: 400 });
        }

        let created = 0;
        const skipped: string[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const barcode = String(row.barcode || '').trim();

            if (!barcode) {
                errors.push(`แถว ${i + 1}: ไม่มีบาร์โค้ด`);
                continue;
            }

            if (!row.name || !String(row.name).trim()) {
                errors.push(`แถว ${i + 1} (${barcode}): ไม่มีชื่อสินค้า`);
                continue;
            }

            try {
                // Check if barcode already exists
                const existing = await db.product.findUnique({ where: { barcode } });

                if (existing) {
                    skipped.push(barcode);
                    continue;
                }

                await db.product.create({
                    data: {
                        barcode,
                        name: String(row.name).trim(),
                        code: row.code ? String(row.code).trim() : null,
                        size: row.size ? String(row.size).trim() : null,
                        color: row.color ? String(row.color).trim() : null,
                        category: row.category ? String(row.category).trim() : null,
                        producttype: row.producttype ? String(row.producttype).trim() : null,
                        price: row.price ? parseFloat(String(row.price)) : 0,
                        status: 'active',
                    },
                });
                created++;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                errors.push(`แถว ${i + 1} (${barcode}): ${msg}`);
            }
        }

        return NextResponse.json({ created, skipped, errors, total: rows.length });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
