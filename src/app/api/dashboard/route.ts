import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    // Today range (Bangkok timezone)
    const now = new Date();
    const todayStart = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) + 'T00:00:00+07:00');
    const todayEnd = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) + 'T23:59:59.999+07:00');

    const [
        totalProducts,
        lowStockProducts,
        todaySales,
        pendingRequests,
        recentSales,
        activeChannels,
    ] = await Promise.all([
        // Total active products
        db.product.count({ where: { status: 'active' } }),

        // Low stock (warehouse qty <= 5 and > 0)
        db.warehouseStock.count({ where: { quantity: { gt: 0, lte: 5 } } }),

        // Today's sales
        db.sale.findMany({
            where: { soldAt: { gte: todayStart, lte: todayEnd }, status: 'active' },
            select: { totalAmount: true },
        }),

        // Pending stock requests (submitted/approved but not yet received)
        db.stockRequest.count({
            where: { status: { in: ['submitted', 'approved', 'allocated', 'packed', 'shipped'] } },
        }),

        // Recent 8 sales
        db.sale.findMany({
            orderBy: { soldAt: 'desc' },
            take: 8,
            where: { status: 'active' },
            select: {
                id: true,
                billCode: true,
                totalAmount: true,
                discount: true,
                soldAt: true,
                channel: { select: { name: true, type: true } },
            },
        }),

        // Active channels (events/branches currently active)
        db.salesChannel.findMany({
            where: { status: { in: ['active', 'approved'] } },
            select: { id: true, name: true, type: true, location: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
    ]);

    // Calculate today's total sales
    const todayTotalSales = todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const todayBillCount = todaySales.length;

    return NextResponse.json({
        stats: {
            totalProducts,
            lowStockProducts,
            todayTotalSales,
            todayBillCount,
            pendingRequests,
        },
        recentSales: recentSales.map(s => ({
            id: s.id,
            billCode: s.billCode,
            totalAmount: Number(s.totalAmount),
            discount: Number(s.discount),
            soldAt: s.soldAt.toISOString(),
            channelName: s.channel?.name || '-',
            channelType: s.channel?.type || '-',
        })),
        activeChannels: activeChannels.map(ch => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            location: ch.location,
            status: ch.status,
        })),
    });
}
