'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StaffSelection } from "@/types/channel";

// Generate auto channel code based on type:
// EVENT → EV-YYYYMM-XXX
// BRANCH → BR-XXX
async function generateChannelCode(type: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (type === 'EVENT') {
        const prefix = `EV-${yearMonth}-`;
        const lastChannel = await db.salesChannel.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
        });
        const lastNum = lastChannel ? parseInt(lastChannel.code.replace(prefix, '')) : 0;
        return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
    } else {
        const prefix = 'BR-';
        const lastChannel = await db.salesChannel.findFirst({
            where: { code: { startsWith: prefix } },
            orderBy: { code: 'desc' },
        });
        const lastNum = lastChannel ? parseInt(lastChannel.code.replace(prefix, '')) : 0;
        return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
    }
}

export async function createChannelWithDetails(formData: FormData) {
    const type = formData.get('type') as string || 'EVENT';
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;
    const salesTarget = formData.get('salesTarget') as string | null;
    const responsiblePersonName = formData.get('responsiblePersonName') as string | null;
    const phone = formData.get('phone') as string | null;
    const customerId = formData.get('customerId') as string | null;
    const staffJson = formData.get('staff') as string | null;
    const initialQty = formData.get('initialQuantity') as string | null;
    const notes = formData.get('notes') as string | null;

    const code = await generateChannelCode(type);
    const staff: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];

    let channel;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        channel = await db.$transaction(async (tx: any) => {
            // 1. Create channel
            const ch = await tx.salesChannel.create({
                data: {
                    code,
                    type,
                    name,
                    location,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    salesTarget: salesTarget ? parseFloat(salesTarget) : null,
                    responsiblePersonName: responsiblePersonName || null,
                    phone: phone || null,
                    customerId: customerId || null,
                    status: 'draft',
                },
            });

            // 2. Assign staff
            if (staff.length > 0) {
                await tx.channelStaff.createMany({
                    data: staff.map(s => ({
                        channelId: ch.id,
                        staffId: s.staffId,
                        isMain: s.isMain,
                    })),
                });
            }

            // 3. Create initial stock request if quantity provided
            if (initialQty && parseInt(initialQty) > 0) {
                await tx.stockRequest.create({
                    data: {
                        channelId: ch.id,
                        requestType: 'INITIAL',
                        requestedTotalQuantity: parseInt(initialQty),
                        status: 'submitted',
                        notes: notes || null,
                    },
                });
            }

            // 4. Log
            await tx.channelLog.create({
                data: {
                    channelId: ch.id,
                    action: 'channel_created',
                    details: {
                        type, name, location,
                        staffCount: staff.length,
                        initialQty: initialQty ? parseInt(initialQty) : 0,
                    },
                    changedBy: '00000000-0000-0000-0000-000000000000',
                },
            });

            return ch;
        });
    } catch (error) {
        console.error('[createChannelWithDetails] Error:', error);
        throw error;
    }

    revalidatePath('/channels');
    revalidatePath('/channels/approvals');
    redirect(`/channels/${channel.id}`);
}
