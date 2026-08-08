import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    // Today range (Bangkok timezone)
    const now = new Date();
    const todayStart = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) + 'T00:00:00+07:00');
    const todayEnd = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }) + 'T23:59:59.999+07:00');

    const [
        totalProducts,
        lowStockProductsRaw,
        todaySales,
        pendingRequests,
        recentSales,
        activeChannels,
    ] = await Promise.all([
        // Total active products
        db.product.count({ where: { status: 'active' } }),

        // Low stock (total channel remaining stock <= 5 and > 0)
        db.$queryRaw`
            SELECT COUNT(*)::int as count
            FROM products p
            JOIN (
                SELECT cs.barcode, SUM(cs.quantity - cs.sold_quantity - cs.returned_quantity) as remaining
                FROM channel_stock cs
                JOIN sales_channels sc ON sc.id = cs.channel_id
                WHERE sc.is_active = true AND sc.status NOT IN ('draft', 'submitted')
                GROUP BY cs.barcode
            ) cs_agg ON cs_agg.barcode = p.barcode
            WHERE p.status = 'active' AND cs_agg.remaining > 0 AND cs_agg.remaining <= 5
        ` as Promise<Array<{ count: number }>>,

        // Today's sales (exclude inactive channels)
        db.sale.findMany({
            where: { soldAt: { gte: todayStart, lte: todayEnd }, status: 'active', channel: { isActive: true } },
            select: { totalAmount: true },
        }),

        // Pending stock requests (submitted/approved but not yet received)
        db.stockRequest.count({
            where: { status: { in: ['submitted', 'approved', 'allocated', 'packed', 'shipped'] } },
        }),

        // Recent 8 sales (exclude inactive channels)
        db.sale.findMany({
            orderBy: { soldAt: 'desc' },
            take: 8,
            where: { status: 'active', channel: { isActive: true } },
            select: {
                id: true,
                billCode: true,
                totalAmount: true,
                discount: true,
                soldAt: true,
                channel: { select: { name: true, type: true } },
            },
        }),

        // Active channels (events/branches currently active, exclude inactive)
        db.salesChannel.findMany({
            where: { status: { in: ['active', 'approved'] }, isActive: true },
            select: { id: true, name: true, type: true, location: true, status: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
    ]);

    // Calculate today's total sales
    const todayTotalSales = todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const todayBillCount = todaySales.length;
    const lowStockProducts = (lowStockProductsRaw as any)[0]?.count || 0;

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
