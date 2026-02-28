import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/channels/[id]/invoices
 * Returns all submitted invoices for a channel (used by channel page download button).
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const invoices = await db.invoice.findMany({
        where: { channelId: id, status: 'submitted' },
        include: {
            channel: {
                select: {
                    id: true, code: true, name: true, location: true,
                    customer: {
                        select: { id: true, name: true, taxId: true, address: true, phone: true, creditTerm: true },
                    },
                },
            },
            customer: {
                select: { id: true, name: true, taxId: true, address: true, phone: true, creditTerm: true },
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
        orderBy: { createdAt: 'asc' },
    });

    if (invoices.length === 0) {
        return NextResponse.json({ error: 'ไม่พบ Invoice ที่อนุมัติแล้ว' }, { status: 404 });
    }

    const result = invoices.map((invoice) => {
        const customer = invoice.customer || invoice.channel.customer;
        return {
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
            notes: invoice.notes,
            channel: {
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
            items: invoice.items.map((item) => ({
                barcode: item.barcode,
                productCode: item.product?.code || item.barcode,
                productName: item.product?.name || '-',
                size: item.product?.size || '-',
                color: item.product?.color || '-',
                invoiceQty: item.invoiceQty,
                unitPrice: Number(item.unitPrice),
                totalAmount: Number(item.totalAmount),
            })),
        };
    });

    return NextResponse.json(result);
}
