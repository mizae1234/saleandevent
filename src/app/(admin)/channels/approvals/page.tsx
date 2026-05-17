import { db } from "@/lib/db";
import { ApprovalsClient } from "./ApprovalsClient";

export default async function ApprovalsPage() {
    const [pendingChannels, pendingRequests, pendingPayments] = await Promise.all([
        db.salesChannel.findMany({
            where: { status: 'submitted' },
            include: { staff: { select: { staff: { select: { name: true } } } } },
            orderBy: { createdAt: 'asc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'submitted' },
            include: { channel: true },
            orderBy: { createdAt: 'asc' },
        }),
        db.salesChannel.findMany({
            where: { status: { in: ['pending_payment', 'payment_approved'] } },
            include: {
                expenses: { select: { amount: true } },
                staff: { select: { id: true } },
            },
            orderBy: { updatedAt: 'desc' },
        }),
    ]);

    return (
        <ApprovalsClient
            pendingChannels={pendingChannels.map(ch => ({
                id: ch.id,
                name: ch.name,
                code: ch.code,
                location: ch.location,
                type: ch.type,
                startDate: ch.startDate ? ch.startDate.toISOString() : null,
                endDate: ch.endDate ? ch.endDate.toISOString() : null,
                createdAt: ch.createdAt.toISOString(),
                staff: ch.staff,
            }))}
            pendingRequests={pendingRequests.map(req => ({
                id: req.id,
                requestType: req.requestType,
                requestedTotalQuantity: req.requestedTotalQuantity,
                notes: req.notes,
                createdAt: req.createdAt.toISOString(),
                channel: { id: req.channel.id, name: req.channel.name, code: req.channel.code, location: req.channel.location },
            }))}
            pendingPayments={pendingPayments.map(ev => ({
                id: ev.id,
                name: ev.name,
                code: ev.code,
                location: ev.location,
                status: ev.status,
                startDate: ev.startDate ? ev.startDate.toISOString() : null,
                endDate: ev.endDate ? ev.endDate.toISOString() : null,
                totalExpenses: ev.expenses.reduce((sum, e) => sum + Number(e.amount), 0),
                expenseCount: ev.expenses.length,
                staffCount: ev.staff.length,
            }))}
        />
    );
}
