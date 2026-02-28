import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Default: current month
    const now = new Date();
    const dateFrom = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = to ? new Date(to + 'T23:59:59.999Z') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Previous period for MoM comparison (same duration)
    const duration = dateTo.getTime() - dateFrom.getTime();
    const prevFrom = new Date(dateFrom.getTime() - duration);
    const prevTo = new Date(dateFrom.getTime() - 1);

    // ═══ Parallel queries ═══
    const [
        currentSales,
        previousSales,
        currentSaleItems,
        channels,
        dailySalesRaw,
        topProductsRaw,
        deadStockRaw,
    ] = await Promise.all([
        // Current period sales
        db.sale.findMany({
            where: { soldAt: { gte: dateFrom, lte: dateTo }, status: 'active' },
            select: { id: true, totalAmount: true, discount: true, channelId: true, soldAt: true },
        }),
        // Previous period sales
        db.sale.findMany({
            where: { soldAt: { gte: prevFrom, lte: prevTo }, status: 'active' },
            select: { totalAmount: true },
        }),
        // Current period sale items (for qty, product insight, COGS-like)
        db.saleItem.findMany({
            where: { sale: { soldAt: { gte: dateFrom, lte: dateTo }, status: 'active' } },
            select: { barcode: true, quantity: true, unitPrice: true, totalAmount: true },
        }),
        // All channels with sales data
        db.salesChannel.findMany({
            where: {
                sales: { some: { soldAt: { gte: dateFrom, lte: dateTo }, status: 'active' } },
            },
            select: {
                id: true, name: true, code: true, type: true, status: true, location: true,
                sales: {
                    where: { soldAt: { gte: dateFrom, lte: dateTo }, status: 'active' },
                    select: { totalAmount: true, discount: true },
                },
                expenses: {
                    where: { createdAt: { gte: dateFrom, lte: dateTo } },
                    select: { amount: true, category: true },
                },
            },
        }),
        // Daily sales for chart
        db.$queryRaw`
            SELECT DATE(sold_at AT TIME ZONE 'Asia/Bangkok') as date, 
                   SUM(total_amount) as total,
                   COUNT(*) as count
            FROM sales 
            WHERE sold_at >= ${dateFrom} AND sold_at <= ${dateTo} AND status = 'active'
            GROUP BY DATE(sold_at AT TIME ZONE 'Asia/Bangkok')
            ORDER BY date ASC
        ` as Promise<Array<{ date: Date; total: any; count: any }>>,
        // Top products
        db.$queryRaw`
            SELECT si.barcode, p.name, p.code, p.size, p.color,
                   SUM(si.quantity) as qty_sold,
                   SUM(si.total_amount) as revenue
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN products p ON p.barcode = si.barcode
            WHERE s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} AND s.status = 'active'
            GROUP BY si.barcode, p.name, p.code, p.size, p.color
            ORDER BY revenue DESC
            LIMIT 10
        ` as Promise<Array<{ barcode: string; name: string; code: string | null; size: string | null; color: string | null; qty_sold: any; revenue: any }>>,
        // Dead stock: high warehouse qty, low/no sales
        db.$queryRaw`
            SELECT ws.barcode, p.name, p.code, p.size, p.color, ws.quantity as stock_qty,
                   COALESCE(sold.qty, 0) as sold_qty
            FROM warehouse_stock ws
            JOIN products p ON p.barcode = ws.barcode
            LEFT JOIN (
                SELECT si.barcode, SUM(si.quantity) as qty
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id
                WHERE s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} AND s.status = 'active'
                GROUP BY si.barcode
            ) sold ON sold.barcode = ws.barcode
            WHERE ws.quantity > 10
            ORDER BY ws.quantity DESC, sold.qty ASC
            LIMIT 10
        ` as Promise<Array<{ barcode: string; name: string; code: string | null; size: string | null; color: string | null; stock_qty: number; sold_qty: any }>>,
    ]);

    // ═══ KPI Calculations ═══
    const totalSales = currentSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const prevTotalSales = previousSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const salesMoM = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;

    const totalQuantity = currentSaleItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalBills = currentSales.length;
    const avgBillSize = totalBills > 0 ? totalSales / totalBills : 0;

    // Derive expenses from channels (no separate query needed)
    const allExpenses: { amount: number; category: string }[] = [];
    channels.forEach(ch => {
        ch.expenses.forEach(e => allExpenses.push({ amount: Number(e.amount), category: e.category }));
    });
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    // Net profit (sales - expenses, since we don't have product cost)
    const netProfit = totalSales - totalExpenses;

    // ═══ Channel performance ═══
    const channelPerformance = channels.map(ch => {
        const sales = ch.sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
        const exp = ch.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const profit = sales - exp;
        const margin = sales > 0 ? (profit / sales) * 100 : 0;
        return {
            id: ch.id,
            name: ch.name,
            code: ch.code,
            type: ch.type,
            status: ch.status,
            location: ch.location,
            sales,
            expenses: exp,
            profit,
            margin,
        };
    }).sort((a, b) => b.sales - a.sales);

    // Events vs Branches
    const events = channelPerformance.filter(c => c.type === 'EVENT');
    const branches = channelPerformance.filter(c => c.type === 'BRANCH');

    // ═══ Daily sales chart data ═══
    const dailySales = (dailySalesRaw as any[]).map(d => ({
        date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
        total: Number(d.total),
        count: Number(d.count),
    }));

    // ═══ Expense breakdown (derived from channels, not a separate query) ═══
    const expenseByCategory: Record<string, number> = {};
    allExpenses.forEach(e => {
        const cat = e.category || 'อื่นๆ';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + e.amount;
    });
    const expenseBreakdown = Object.entries(expenseByCategory)
        .map(([category, amount]) => ({
            category,
            amount,
            percent: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // ═══ Products ═══
    const topProducts = (topProductsRaw as any[]).map(p => ({
        barcode: p.barcode,
        name: p.name,
        code: p.code,
        size: p.size,
        color: p.color,
        qtySold: Number(p.qty_sold),
        revenue: Number(p.revenue),
    }));

    const deadStock = (deadStockRaw as any[]).map(p => ({
        barcode: p.barcode,
        name: p.name,
        code: p.code,
        size: p.size,
        color: p.color,
        stockQty: Number(p.stock_qty),
        soldQty: Number(p.sold_qty),
    }));

    return NextResponse.json({
        kpi: {
            totalSales,
            salesMoM,
            netProfit,
            totalQuantity,
            avgBillSize,
            totalBills,
            totalExpenses,
        },
        dailySales,
        events,
        branches,
        topProducts,
        deadStock,
        expenseBreakdown,
        dateRange: {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
        },
    });
}
