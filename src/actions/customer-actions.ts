'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============ Generate Customer Code ============
async function generateCustomerCode(): Promise<string> {
    const prefix = 'C';
    const lastCustomer = await db.customer.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
    });
    const lastNum = lastCustomer ? parseInt(lastCustomer.code.replace(prefix, '')) : 0;
    return `${prefix}${String(lastNum + 1).padStart(5, '0')}`;
}

// ============ CREATE ============
export async function createCustomer(formData: FormData) {
    const name = formData.get('name') as string;
    const customCode = formData.get('code') as string | null;
    const taxId = formData.get('taxId') as string | null;
    const address = formData.get('address') as string | null;
    const phone = formData.get('phone') as string | null;
    const creditTerm = formData.get('creditTerm') as string | null;
    const referenceNo = formData.get('referenceNo') as string | null;
    const discountPercent = formData.get('discountPercent') as string | null;

    if (!name) throw new Error('กรุณากรอกชื่อลูกค้า');

    const code = customCode || await generateCustomerCode();

    await db.customer.create({
        data: {
            code,
            name,
            taxId: taxId || null,
            address: address || null,
            phone: phone || null,
            creditTerm: creditTerm ? parseInt(creditTerm) : 0,
            referenceNo: referenceNo || null,
            discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        },
    });

    revalidatePath('/finance/customers');
    redirect('/finance/customers');
}

// ============ UPDATE ============
export async function updateCustomer(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const taxId = formData.get('taxId') as string | null;
    const address = formData.get('address') as string | null;
    const phone = formData.get('phone') as string | null;
    const creditTerm = formData.get('creditTerm') as string | null;
    const referenceNo = formData.get('referenceNo') as string | null;
    const discountPercent = formData.get('discountPercent') as string | null;

    if (!name) throw new Error('กรุณากรอกชื่อลูกค้า');

    await db.customer.update({
        where: { id },
        data: {
            name,
            taxId: taxId || null,
            address: address || null,
            phone: phone || null,
            creditTerm: creditTerm ? parseInt(creditTerm) : 0,
            referenceNo: referenceNo || null,
            discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        },
    });

    revalidatePath('/finance/customers');
    redirect('/finance/customers');
}

// ============ DELETE ============
export async function deleteCustomer(id: string) {
    await db.customer.delete({ where: { id } });
    revalidatePath('/finance/customers');
}
