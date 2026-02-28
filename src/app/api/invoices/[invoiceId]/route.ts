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
                select: {
                    id: true, code: true, name: true, location: true,
                    customer: {
                        select: { id: true, code: true, name: true, taxId: true, address: true, phone: true, creditTerm: true },
                    },
                },
            },
            customer: {
                select: { id: true, code: true, name: true, taxId: true, address: true, phone: true, creditTerm: true },
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

    // Use invoice's direct customer, fall back to channel's customer
    const customer = invoice.customer || invoice.channel.customer;

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
        channel: {
            id: invoice.channel.id,
            code: invoice.channel.code,
            name: invoice.channel.name,
            location: invoice.channel.location,
        },
        customer: customer ? {
            name: customer.name,
            taxId: customer.taxId,
            address: customer.address,
            phone: customer.phone,
            creditTerm: customer.creditTerm,
        } : null,
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
