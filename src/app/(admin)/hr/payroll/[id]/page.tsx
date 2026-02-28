import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getChannelCompensationSummary } from "@/actions/channel-actions";
import PayrollDetailClient from "./PayrollDetailClient";

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;

    const [channel, compensation, expenseAggs] = await Promise.all([
        db.salesChannel.findUnique({
            where: { id: channelId },
            select: {
                id: true, name: true, code: true, location: true,
                startDate: true, endDate: true, status: true,
                staff: {
                    include: {
                        staff: {
                            select: {
                                id: true, code: true, name: true,
                                bankAccountNo: true, bankName: true,
                                phone: true, paymentType: true,
                            },
                        },
                    },
                },
            },
        }),
        getChannelCompensationSummary(channelId).catch(() => null),
        // Sum approved expenses per staff
        db.channelExpense.groupBy({
            by: ['createdBy'],
            where: {
                channelId,
                status: { in: ['approved', 'pending'] },
                createdBy: { not: null },
            },
            _sum: { amount: true },
        }),
    ]);

    if (!channel) notFound();

    // Build expense map: staffId -> total
    const expenseMap = new Map(
        expenseAggs.map(e => [e.createdBy!, Number(e._sum.amount || 0)])
    );

    // Merge staff bank data with compensation data
    const staffMap = new Map(channel.staff.map(cs => [cs.staffId, { ...cs.staff, channelStaffId: cs.id, isWagePaid: cs.isWagePaid, wagePaidAt: cs.wagePaidAt, isCommissionPaid: cs.isCommissionPaid, commissionPaidAt: cs.commissionPaidAt, isSubmitted: cs.isSubmitted, submittedAt: cs.submittedAt }]));

    const rows = (compensation?.staffSummary || []).map(s => {
        const staff = staffMap.get(s.staffId);
        const expenseAmount = expenseMap.get(s.staffId) || 0;
        return {
            ...s,
            staffCode: staff?.code || '-',
            bankName: staff?.bankName || '-',
            bankAccountNo: staff?.bankAccountNo || '-',
            phone: staff?.phone || '-',
            paymentType: staff?.paymentType || 'daily',
            isWagePaid: staff?.isWagePaid || false,
            wagePaidAt: staff?.wagePaidAt?.toISOString() || null,
            isCommissionPaid: staff?.isCommissionPaid || false,
            commissionPaidAt: staff?.commissionPaidAt?.toISOString() || null,
            isSubmitted: staff?.isSubmitted || false,
            submittedAt: staff?.submittedAt?.toISOString() || null,
            expenseAmount,
        };
    });

    return (
        <PayrollDetailClient
            channel={{
                id: channel.id,
                name: channel.name,
                code: channel.code,
                location: channel.location || '',
                startDate: channel.startDate?.toISOString() || null,
                endDate: channel.endDate?.toISOString() || null,
            }}
            rows={rows}
            totalChannelSales={compensation?.totalChannelSales || 0}
        />
    );
}
