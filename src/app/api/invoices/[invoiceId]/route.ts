import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    const { invoiceId } = await params;

    const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            channel: {
                select: { id: true, code: true, name: true, location: true },
            },
            customer: {
                select: { id: true, code: true, name: true, taxId: true, address: true },
            },
            items: {
                include: {
                    product: {
                        select: { barcode: true, code: true, name: true, color: true, size: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        invoicePercent: Number(invoice.invoicePercent),
        totalQuantity: invoice.totalQuantity,
        totalAmount: Number(invoice.totalAmount),
        discountPercent: Number(invoice.discountPercent),
        discountAmount: Number(invoice.discountAmount),
        vatAmount: Number(invoice.vatAmount),
        grandTotal: Number(invoice.grandTotal),
        status: invoice.status,
        notes: invoice.notes,
        channel: invoice.channel,
        customer: invoice.customer,
        items: invoice.items.map(item => ({
            barcode: item.barcode,
            productCode: item.product?.code || item.barcode,
            productName: item.product?.name || '-',
            size: item.product?.size || '-',
            color: item.product?.color || '-',
            originalQty: item.originalQty,
            invoiceQty: item.invoiceQty,
            unitPrice: Number(item.unitPrice),
            totalAmount: Number(item.totalAmount),
        })),
    });
}
