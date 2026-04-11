'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface CreditNotePayload {
    invoiceId: string;
    cnNumber: string;
    totalAmount: number;
    reason: string;
    items: {
        barcode: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        invoiceItemId: string;
    }[];
}

export async function getNextCNNumber(): Promise<string> {
    const lastCN = await db.creditNote.findFirst({
        orderBy: { cnNumber: 'desc' },
    });
    
    let nextNum = 1;
    if (lastCN && lastCN.cnNumber && lastCN.cnNumber.startsWith('CN-')) {
        const lastNumStr = lastCN.cnNumber.replace('CN-', '');
        const parsed = parseInt(lastNumStr, 10);
        if (!isNaN(parsed)) {
            nextNum = parsed + 1;
        }
    }
    return `CN-${String(nextNum).padStart(6, '0')}`;
}

export async function createCreditNote(payload: CreditNotePayload) {
    try {
        const { invoiceId, cnNumber, totalAmount, reason, items } = payload;
        const trimmedCn = (cnNumber || '').trim();

        if (!trimmedCn) {
            throw new Error("กรุณาระบุเลขที่ใบลดหนี้");
        }

        // Check for duplicate CN Number
        const existing = await db.creditNote.findUnique({
            where: { cnNumber: trimmedCn }
        });
        if (existing) {
            throw new Error(`เลขใบลดหนี้ ${trimmedCn} ถูกใช้ไปแล้ว กรุณาใช้เลขอื่น`);
        }

        // Create
        const result = await db.$transaction(async (tx) => {
            const cn = await tx.creditNote.create({
                data: {
                    invoiceId,
                    date: new Date(),
                    type: 'VALUE', // By default as per requirement
                    totalAmount,
                    reason,
                    cnNumber: trimmedCn,
                    items: {
                        create: items.map(item => ({
                            invoiceItemId: item.invoiceItemId,
                            barcode: item.barcode,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalAmount: item.totalAmount
                        }))
                    }
                }
            });

            // Note: Does NOT restock. Just deducts from Invoice balance

            return cn;
        });

        revalidatePath(`/finance/invoices`);
        revalidatePath(`/finance/invoices/${payload.invoiceId}`, 'page');
        
        return { success: true, cnId: result.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCreditNote(cnId: string) {
    return db.creditNote.findUnique({
        where: { id: cnId },
        include: {
            items: {
                include: {
                    product: {
                        select: { name: true, color: true, size: true }
                    }
                }
            },
            invoice: {
                include: {
                    channel: true,
                    customer: true
                }
            }
        }
    });
}

export async function updateCreditNote(cnId: string, payload: CreditNotePayload) {
    try {
        const { cnNumber, totalAmount, reason, items } = payload;
        const trimmedCn = (cnNumber || '').trim();

        if (!trimmedCn) {
            throw new Error("กรุณาระบุเลขที่ใบลดหนี้");
        }

        const existing = await db.creditNote.findUnique({
            where: { cnNumber: trimmedCn }
        });
        if (existing && existing.id !== cnId) {
            throw new Error(`เลขใบลดหนี้ ${trimmedCn} ถูกใช้ไปแล้ว กรุณาใช้เลขอื่น`);
        }

        await db.$transaction([
            db.creditNoteItem.deleteMany({ where: { creditNoteId: cnId } }),
            db.creditNote.update({
                where: { id: cnId },
                data: {
                    cnNumber: trimmedCn,
                    totalAmount,
                    reason,
                    items: {
                        create: items.map(item => ({
                            invoiceItemId: item.invoiceItemId,
                            barcode: item.barcode,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalAmount: item.totalAmount
                        }))
                    }
                }
            })
        ]);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCreditNote(cnId: string) {
    try {
        await db.creditNote.delete({ where: { id: cnId } });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCreditNotePdfData(cnId: string) {
    const cn = await getCreditNote(cnId);
    if (!cn || !cn.invoice) throw new Error("ไม่พบข้อมูลใบลดหนี้");

    return {
        cnNumber: cn.cnNumber,
        cnDate: cn.date ? cn.date.toISOString() : cn.createdAt.toISOString(),
        reason: cn.reason,
        totalAmount: Number(cn.totalAmount),
        invoiceNumber: cn.invoice.invoiceNumber,
        channel: {
            code: cn.invoice.channel.code,
            name: cn.invoice.channel.name,
            location: cn.invoice.channel.location || ""
        },
        customer: cn.invoice.customer ? {
            name: cn.invoice.customer.name,
            taxId: cn.invoice.customer.taxId,
            address: cn.invoice.customer.address,
            phone: cn.invoice.customer.phone
        } : null,
        items: cn.items.map(item => ({
            barcode: item.barcode,
            productName: item.product.name,
            size: item.product.size || "-",
            color: item.product.color || "-",
            qty: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalAmount: Number(item.totalAmount)
        }))
    };
}
