'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// ============ QUERY: Channels with shipped items ============

export async function getChannelsForInvoice() {
    // Step 1: Get channelIds that have shipped/received stock requests
    const shippedRequests = await db.stockRequest.findMany({
        where: { status: { in: ['shipped', 'received'] } },
        select: { channelId: true },
        distinct: ['channelId'],
    });

    const channelIds = shippedRequests.map((r) => r.channelId);
    if (channelIds.length === 0) return [];

    // Step 2: Get those channels with customer and invoice count
    const channels = await db.salesChannel.findMany({
        where: { id: { in: channelIds } },
        include: {
            customer: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Step 3: Get invoice counts per channel
    const invoiceCounts = await db.invoice.groupBy({
        by: ['channelId'],
        where: { channelId: { in: channelIds } },
        _count: { id: true },
    });

    const countMap = new Map(invoiceCounts.map((c) => [c.channelId, c._count.id]));

    return channels.map((ch) => ({
        ...ch,
        invoiceCount: countMap.get(ch.id) || 0,
    }));
}

// ============ QUERY: Get shipped items for a channel ============

export async function getChannelShippedItems(channelId: string) {
    // Get all allocations from shipped/received stock requests for this channel
    const allocations = await db.warehouseAllocation.findMany({
        where: {
            request: {
                channelId,
                status: { in: ['shipped', 'received'] },
            },
        },
        include: {
            product: {
                select: {
                    barcode: true,
                    code: true,
                    name: true,
                    color: true,
                    size: true,
                    price: true,
                },
            },
        },
    });

    // Aggregate by barcode (same product may appear in multiple requests)
    const itemMap = new Map<string, {
        barcode: string;
        code: string | null;
        name: string;
        color: string | null;
        size: string | null;
        totalShipped: number;
        unitPrice: number;
    }>();

    for (const alloc of allocations) {
        const existing = itemMap.get(alloc.barcode);
        if (existing) {
            existing.totalShipped += alloc.packedQuantity;
        } else {
            itemMap.set(alloc.barcode, {
                barcode: alloc.barcode,
                code: alloc.product.code,
                name: alloc.product.name,
                color: alloc.product.color,
                size: alloc.product.size,
                totalShipped: alloc.packedQuantity,
                unitPrice: Number(alloc.price),
            });
        }
    }

    return Array.from(itemMap.values());
}

// ============ QUERY: Get channel info ============

export async function getChannelForInvoice(channelId: string) {
    return db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            customer: { select: { id: true, name: true, code: true, taxId: true, address: true, discountPercent: true } },
        },
    });
}

// ============ CREATE INVOICE (draft) ============

interface InvoiceItemInput {
    barcode: string;
    originalQty: number;
    invoiceQty: number;
    unitPrice: number;
}

export async function createInvoice(data: {
    channelId: string;
    customerId?: string | null;
    invoicePercent: number;
    discountPercent: number;
    notes?: string;
    invoiceDate?: string;
    items: InvoiceItemInput[];
}) {
    try {
        const totalQuantity = data.items.reduce((sum, i) => sum + i.invoiceQty, 0);
        const totalAmount = data.items.reduce((sum, i) => sum + i.invoiceQty * i.unitPrice, 0);
        const discountAmount = totalAmount * (data.discountPercent / 100);
        const afterDiscount = totalAmount - discountAmount;
        const vatAmount = afterDiscount * 0.07;
        const grandTotal = afterDiscount + vatAmount;

        const invoice = await db.invoice.create({
            data: {
                channelId: data.channelId,
                customerId: data.customerId || null,
                invoicePercent: data.invoicePercent,
                totalQuantity,
                totalAmount,
                discountPercent: data.discountPercent,
                discountAmount,
                vatAmount,
                grandTotal,
                status: 'draft',
                notes: data.notes || null,
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
                items: {
                    create: data.items.map((item) => ({
                        barcode: item.barcode,
                        originalQty: item.originalQty,
                        invoiceQty: item.invoiceQty,
                        unitPrice: item.unitPrice,
                        totalAmount: item.invoiceQty * item.unitPrice,
                    })),
                },
            },
        });

        revalidatePath(`/finance/invoices/${data.channelId}`);
        return invoice;
    } catch (error) {
        console.error('[createInvoice] Error:', error);
        throw error;
    }
}

// ============ UPDATE INVOICE (draft only) ============

export async function updateInvoice(
    invoiceId: string,
    data: {
        invoicePercent: number;
        discountPercent: number;
        notes?: string;
        invoiceDate?: string;
        items: InvoiceItemInput[];
    }
) {
    // Verify invoice is still draft
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('ไม่พบ Invoice');
    if (invoice.status !== 'draft') throw new Error('ไม่สามารถแก้ไข Invoice ที่ submit แล้วได้');

    const totalQuantity = data.items.reduce((sum, i) => sum + i.invoiceQty, 0);
    const totalAmount = data.items.reduce((sum, i) => sum + i.invoiceQty * i.unitPrice, 0);
    const discountAmount = totalAmount * (data.discountPercent / 100);
    const afterDiscount = totalAmount - discountAmount;
    const vatAmount = afterDiscount * 0.07;
    const grandTotal = afterDiscount + vatAmount;

    // Delete existing items and recreate
    await db.$transaction([
        db.invoiceItem.deleteMany({ where: { invoiceId } }),
        db.invoice.update({
            where: { id: invoiceId },
            data: {
                invoicePercent: data.invoicePercent,
                totalQuantity,
                totalAmount,
                discountPercent: data.discountPercent,
                discountAmount,
                vatAmount,
                grandTotal,
                notes: data.notes || null,
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
                items: {
                    create: data.items.map((item) => ({
                        barcode: item.barcode,
                        originalQty: item.originalQty,
                        invoiceQty: item.invoiceQty,
                        unitPrice: item.unitPrice,
                        totalAmount: item.invoiceQty * item.unitPrice,
                    })),
                },
            },
        }),
    ]);

    revalidatePath(`/finance/invoices/${invoice.channelId}`);
    revalidatePath(`/finance/invoices/${invoice.channelId}/${invoiceId}`);
}

// ============ SUBMIT INVOICE (generate invoice number) ============

async function generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;

    const lastInvoice = await db.invoice.findFirst({
        where: {
            invoiceNumber: { startsWith: prefix },
        },
        orderBy: { invoiceNumber: 'desc' },
    });

    const lastNum = lastInvoice?.invoiceNumber
        ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ''))
        : 0;

    return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
}

export async function submitInvoice(invoiceId: string) {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('ไม่พบ Invoice');
    if (invoice.status !== 'draft') throw new Error('Invoice นี้ถูก submit แล้ว');

    const invoiceNumber = await generateInvoiceNumber();

    await db.invoice.update({
        where: { id: invoiceId },
        data: {
            status: 'submitted',
            invoiceNumber,
        },
    });

    revalidatePath(`/finance/invoices/${invoice.channelId}`);
    revalidatePath(`/finance/invoices/${invoice.channelId}/${invoiceId}`);
    return invoiceNumber;
}

// ============ DELETE INVOICE (draft only) ============

export async function deleteInvoice(invoiceId: string) {
    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('ไม่พบ Invoice');
    if (invoice.status !== 'draft') throw new Error('ไม่สามารถลบ Invoice ที่ submit แล้วได้');

    await db.invoice.delete({ where: { id: invoiceId } });
    revalidatePath(`/finance/invoices/${invoice.channelId}`);
}

// ============ QUERY: Get invoices for a channel ============

export async function getInvoicesByChannel(channelId: string) {
    return db.invoice.findMany({
        where: { channelId },
        include: {
            _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ============ QUERY: Get single invoice with items ============

export async function getInvoice(invoiceId: string) {
    return db.invoice.findUnique({
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
}
