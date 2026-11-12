'use server';

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { StaffSelection } from "@/types/channel";

export async function updateChannelWithDetails(channelId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const startDate = formData.get('startDate') as string | null;
    const endDate = formData.get('endDate') as string | null;
    const salesTarget = formData.get('salesTarget') as string | null;
    const responsiblePersonName = formData.get('responsiblePersonName') as string | null;
    const phone = formData.get('phone') as string | null;
    const customerId = formData.get('customerId') as string | null;
    const staffJson = formData.get('staff') as string | null;
    const latitudeStr = formData.get('latitude') as string | null;
    const longitudeStr = formData.get('longitude') as string | null;
    const checkInRadiusKmStr = formData.get('checkInRadiusKm') as string | null;
    const workStartTime = (formData.get('workStartTime') as string | null)?.trim() || '10:00';
    const workEndTime = (formData.get('workEndTime') as string | null)?.trim() || '21:00';

    const latitude = latitudeStr && latitudeStr.trim() !== '' ? parseFloat(latitudeStr) : null;
    const longitude = longitudeStr && longitudeStr.trim() !== '' ? parseFloat(longitudeStr) : null;
    const checkInRadiusKm = checkInRadiusKmStr && checkInRadiusKmStr.trim() !== '' ? parseFloat(checkInRadiusKmStr) : 0.5;

    const staff: StaffSelection[] = staffJson ? JSON.parse(staffJson) : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
        // 1. Update channel
        await tx.salesChannel.update({
            where: { id: channelId },
            data: {
                name,
                location,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                salesTarget: salesTarget ? parseFloat(salesTarget) : null,
                responsiblePersonName: responsiblePersonName || null,
                phone: phone || null,
                customerId: customerId || null,
                latitude: latitude !== null && !Number.isNaN(latitude) ? latitude : null,
                longitude: longitude !== null && !Number.isNaN(longitude) ? longitude : null,
                checkInRadiusKm: !Number.isNaN(checkInRadiusKm) ? checkInRadiusKm : 0.5,
                workStartTime,
                workEndTime,
            },
        });

        // 2. Sync staff
        await tx.channelStaff.deleteMany({ where: { channelId } });
        if (staff.length > 0) {
            await tx.channelStaff.createMany({
                data: staff.map(s => ({
                    channelId,
                    staffId: s.staffId,
                    isMain: s.isMain,
                })),
            });
        }

        // 3. Update stock request quantity if provided
        const initialQuantity = formData.get('initialQuantity') as string | null;
        if (initialQuantity && parseInt(initialQuantity) > 0) {
            const qty = parseInt(initialQuantity);
            // Find existing INITIAL request
            const existingRequest = await tx.stockRequest.findFirst({
                where: { channelId, requestType: 'INITIAL' },
            });
            if (existingRequest) {
                await tx.stockRequest.update({
                    where: { id: existingRequest.id },
                    data: { requestedTotalQuantity: qty },
                });
            } else {
                await tx.stockRequest.create({
                    data: {
                        channelId,
                        requestType: 'INITIAL',
                        requestedTotalQuantity: qty,
                        status: 'submitted',
                    },
                });
            }
        }

        // 4. Log
        await tx.channelLog.create({
            data: {
                channelId,
                action: 'channel_updated',
                details: { name, location, staffCount: staff.length, initialQuantity: initialQuantity ? parseInt(initialQuantity) : null },
                changedBy: '00000000-0000-0000-0000-000000000000',
            },
        });
    });

    revalidatePath(`/channels/${channelId}`);
    revalidatePath('/channels');
}
