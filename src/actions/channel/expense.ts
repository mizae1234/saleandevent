'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
