'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { deleteFromR2 } from "@/lib/r2";

export async function addChannelExpense(
    channelId: string,
    data: { category: string; amount: number; description: string },
    staffId?: string
) {
    await db.channelExpense.create({
        data: {
            channelId,
            category: data.category,
            amount: data.amount,
            description: data.description,
            status: 'approved',
            createdBy: staffId || null,
        },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'expense_added',
            details: data,
            changedBy: staffId || '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath(`/hr/payroll/${channelId}`);
}

export async function removeChannelExpense(expenseId: string, channelId: string) {
    await db.channelExpense.delete({
        where: { id: expenseId },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'expense_removed',
            details: { expenseId },
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
}

export async function deletePayrollAttachment(attachmentId: string) {
    const attachment = await db.payrollAttachment.findUnique({
        where: { id: attachmentId },
        include: { channelStaff: { select: { channelId: true } } },
    });

    if (!attachment) return;

    // Delete from R2
    try {
        await deleteFromR2(attachment.fileUrl);
    } catch (e) {
        console.error('Failed to delete from R2:', e);
    }

    // Delete from DB
    await db.payrollAttachment.delete({
        where: { id: attachmentId },
    });

    revalidatePath(`/hr/payroll/${attachment.channelStaff.channelId}`);
}
