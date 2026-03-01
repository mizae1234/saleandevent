'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitForPaymentApproval(channelId: string) {
    await db.salesChannel.update({
        where: { id: channelId },
        data: { status: 'pending_payment' },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'submitted_for_payment',
            details: {},
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels/approvals/payment');
}

export async function approvePayment(channelId: string) {
    await db.salesChannel.update({
        where: { id: channelId },
        data: { status: 'payment_approved' },
    });

    await db.channelLog.create({
        data: {
            channelId,
            action: 'payment_approved',
            details: {},
            changedBy: '00000000-0000-0000-0000-000000000000',
        },
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels/approvals/payment');
}
