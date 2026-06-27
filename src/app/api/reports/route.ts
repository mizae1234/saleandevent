import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const channelId = searchParams.get("channelId") || "all";
    const channelType = searchParams.get("channelType") || "all"; // "all" | "EVENT" | "BRANCH"
    const tab = searchParams.get("tab"); // "products" | "revenue" | "quantity" | "stock" | "totalStock" or null
    const includeClosed = searchParams.get("includeClosed") === "true";

    // Default: this month
    const now = new Date();
    const dateFrom = fromStr
        ? new Date(`${fromStr}T00:00:00+07:00`)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = toStr
        ? new Date(`${toStr}T23:59:59+07:00`)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const channelFilter = channelId !== "all"
        ? Prisma.sql`AND s.channel_id = ${channelId}::uuid`
        : Prisma.empty;

    const typeFilter = channelType !== "all"
        ? Prisma.sql`AND sc.type = ${channelType}`
        : Prisma.empty;

    const closedStatusFilter = !includeClosed
        ? Prisma.sql`AND sc.status NOT IN ('closed', 'completed', 'returned')`
        : Prisma.empty;

    // 0. List of all channels for dropdown (always needed)
    const availableChannelsPromise = db.salesChannel.findMany({
        where: {
            isActive: true,
            status: { 
                notIn: [
                    'draft', 
                    'submitted', 
                    ...(includeClosed ? [] : ['closed', 'completed', 'returned'])
                ] 
            },
            ...(channelType !== 'all' ? { type: channelType } : {}),
        },
        select: { id: true, name: true, code: true, type: true, status: true },
        orderBy: { createdAt: 'desc' }
    });

    // Lazy load queries based on active tab parameter
    let topProductsPromise = Promise.resolve<any[]>([]);
    let channelRevenuePromise = Promise.resolve<any[]>([]);
    let channelQuantityPromise = Promise.resolve<any[]>([]);
    let channelStockPromise = Promise.resolve<any[]>([]);
    let totalStockPromise = Promise.resolve<any[]>([]);

    if (!tab || tab === "products") {
        // 1. Top products by revenue (exclude inactive channels)
        topProductsPromise = db.$queryRaw`
            SELECT si.barcode, p.name, p.code, p.size, p.color,
                   SUM(si.quantity) as qty_sold,
                   SUM(si.total_amount) as revenue,
                   COUNT(DISTINCT s.id) as bill_count
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN sales_channels sc ON sc.id = s.channel_id AND sc.is_active = true
            JOIN products p ON p.barcode = si.barcode
            WHERE s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} AND s.status = 'active'
            ${channelFilter}
            ${typeFilter}
            ${closedStatusFilter}
            GROUP BY si.barcode, p.name, p.code, p.size, p.color
            ORDER BY revenue DESC
        ` as Promise<any[]>;
    }

    if (!tab || tab === "revenue") {
        // 2. Channel revenue (exclude inactive channels)
        channelRevenuePromise = db.$queryRaw`
            SELECT sc.id, sc.name, sc.code, sc.type, sc.location, sc.sales_target,
                   COALESCE(SUM(s.total_amount), 0) as total_sales,
                   COUNT(s.id) as bill_count
            FROM sales_channels sc
            LEFT JOIN sales s ON s.channel_id = sc.id 
                AND s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} 
                AND s.status = 'active'
            WHERE sc.is_active = true
                AND sc.status NOT IN ('draft', 'submitted')
                ${channelId !== "all" ? Prisma.sql`AND sc.id = ${channelId}::uuid` : Prisma.empty}
                ${typeFilter}
                ${closedStatusFilter}
            GROUP BY sc.id, sc.name, sc.code, sc.type, sc.location, sc.sales_target
            ORDER BY total_sales DESC
        ` as Promise<any[]>;
    }

    if (!tab || tab === "quantity") {
        // 3. Channel quantity sold (exclude inactive channels)
        channelQuantityPromise = db.$queryRaw`
            SELECT sc.id, sc.name, sc.code, sc.type,
                   COALESCE(SUM(si.quantity), 0) as total_qty,
                   COUNT(DISTINCT s.id) as bill_count
            FROM sales_channels sc
            LEFT JOIN sales s ON s.channel_id = sc.id 
                AND s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} 
                AND s.status = 'active'
            LEFT JOIN sale_items si ON si.sale_id = s.id
            WHERE sc.is_active = true
                AND sc.status NOT IN ('draft', 'submitted')
                ${channelId !== "all" ? Prisma.sql`AND sc.id = ${channelId}::uuid` : Prisma.empty}
                ${typeFilter}
                ${closedStatusFilter}
            GROUP BY sc.id, sc.name, sc.code, sc.type
            ORDER BY total_qty DESC
        ` as Promise<any[]>;
    }

    if (!tab || tab === "stock") {
        // 4. Channel stock — real-time (exclude inactive channels, closed channels optional)
        // Optimization: Filter stock to only retrieve items with quantity > 0 directly from DB
        channelStockPromise = db.salesChannel.findMany({
            where: {
                isActive: true,
                status: { 
                    notIn: [
                        'draft', 
                        'submitted', 
                        ...(includeClosed ? [] : ['closed', 'completed', 'returned'])
                    ] 
                },
                ...(channelId !== "all" ? { id: channelId } : {}),
                ...(channelType !== 'all' ? { type: channelType } : {}),
            },
            select: {
                id: true,
                name: true,
                code: true,
                type: true,
                status: true,
                isActive: true,
                stock: {
                    where: {
                        quantity: { gt: 0 }
                    },
                    select: {
                        barcode: true,
                        quantity: true,
                        soldQuantity: true,
                        returnedQuantity: true,
                        product: {
                            select: {
                                name: true,
                                code: true,
                                size: true,
                                color: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }) as any;
    }

    if (!tab || tab === "totalStock") {
        // Channel filters for totalStock subquery (uses sc. prefix like the subquery)
        const totalStockChannelFilter = channelId !== "all"
            ? Prisma.sql`AND sc.id = ${channelId}::uuid`
            : Prisma.empty;
        const totalStockTypeFilter = channelType !== "all"
            ? Prisma.sql`AND sc.type = ${channelType}`
            : Prisma.empty;

        const isFiltered = channelId !== "all" || channelType !== "all";

        const warehouseQtySql = isFiltered
            ? Prisma.sql`0 as warehouse_qty`
            : Prisma.sql`GREATEST(COALESCE(ws.quantity, 0), 0) as warehouse_qty`;

        const totalQtySql = isFiltered
            ? Prisma.sql`COALESCE(cs_agg.channel_remaining, 0) as total_qty`
            : Prisma.sql`GREATEST(COALESCE(ws.quantity, 0), 0) + COALESCE(cs_agg.channel_remaining, 0) as total_qty`;

        const whereStockSql = isFiltered
            ? Prisma.sql`COALESCE(cs_agg.channel_remaining, 0) > 0`
            : Prisma.sql`GREATEST(COALESCE(ws.quantity, 0), 0) > 0 OR COALESCE(cs_agg.channel_remaining, 0) > 0`;

        // 5. Total stock summary — warehouse + all channel stock remaining
        totalStockPromise = db.$queryRaw`
            SELECT
                p.code,
                p.name,
                p.color,
                p.size,
                ${warehouseQtySql},
                COALESCE(cs_agg.channel_remaining, 0) as channel_qty,
                ${totalQtySql}
            FROM products p
            LEFT JOIN warehouse_stock ws ON ws.barcode = p.barcode
            LEFT JOIN (
                SELECT
                    cs.barcode,
                    SUM(cs.quantity - cs.sold_quantity - cs.returned_quantity) as channel_remaining
                FROM channel_stock cs
                JOIN sales_channels sc ON sc.id = cs.channel_id
                WHERE sc.is_active = true
                    AND sc.status NOT IN ('draft', 'submitted')
                    ${closedStatusFilter}
                    ${totalStockChannelFilter}
                    ${totalStockTypeFilter}
                GROUP BY cs.barcode
            ) cs_agg ON cs_agg.barcode = p.barcode
            WHERE p.status = 'active'
                AND (${whereStockSql})
            ORDER BY p.code ASC, p.name ASC, p.color ASC, p.size ASC
        ` as Promise<any[]>;
    }

    const [
        availableChannels,
        topProductsRaw,
        channelRevenueRaw,
        channelQuantityRaw,
        channelStockRaw,
        totalStockRaw,
    ] = await Promise.all([
        availableChannelsPromise,
        topProductsPromise,
        channelRevenuePromise,
        channelQuantityPromise,
        channelStockPromise,
        totalStockPromise,
    ]);

    // Format top products
    const topProducts = topProductsRaw.map((p) => ({
        barcode: p.barcode,
        name: p.name,
        code: p.code,
        size: p.size,
        color: p.color,
        qtySold: Number(p.qty_sold),
        revenue: Number(p.revenue),
        billCount: Number(p.bill_count),
    }));

    // Format channel revenue
    const channelRevenue = channelRevenueRaw.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.type,
        location: c.location,
        salesTarget: Number(c.sales_target) || 0,
        totalSales: Number(c.total_sales),
        billCount: Number(c.bill_count),
    }));

    // Format channel quantity
    const channelQuantity = channelQuantityRaw.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        type: c.type,
        totalQty: Number(c.total_qty),
        billCount: Number(c.bill_count),
    }));

    // Format channel stock
    const channelStock = channelStockRaw.map((c: any) => {
        const totalSent = c.stock ? c.stock.reduce((s: number, i: any) => s + i.quantity, 0) : 0;
        const totalSold = c.stock ? c.stock.reduce((s: number, i: any) => s + i.soldQuantity, 0) : 0;
        const totalReturned = c.stock ? c.stock.reduce((s: number, i: any) => s + i.returnedQuantity, 0) : 0;
        const totalRemaining = totalSent - totalSold - totalReturned;

        return {
            id: c.id,
            name: c.name,
            code: c.code,
            type: c.type,
            status: c.status,
            isActive: c.isActive,
            totalSent,
            totalSold,
            totalReturned,
            totalRemaining,
            soldPercent: totalSent > 0 ? Math.round((totalSold / totalSent) * 100) : 0,
            items: (c.stock || [])
                .filter((i: any) => i.quantity > 0)
                .map((i: any) => ({
                    barcode: i.barcode,
                    name: i.product.name,
                    code: i.product.code,
                    size: i.product.size,
                    color: i.product.color,
                    sent: i.quantity,
                    sold: i.soldQuantity,
                    returned: i.returnedQuantity,
                    remaining: i.quantity - i.soldQuantity - i.returnedQuantity,
                }))
                .sort((a: any, b: any) => b.sold - a.sold),
        };
    });

    // Format total stock summary
    const totalStockSummary = totalStockRaw.map((p) => ({
        code: p.code,
        name: p.name,
        color: p.color,
        size: p.size,
        warehouseQty: Number(p.warehouse_qty),
        channelQty: Number(p.channel_qty),
        totalQty: Number(p.total_qty),
    }));

    return NextResponse.json({
        availableChannels,
        topProducts,
        channelRevenue,
        channelQuantity,
        channelStock,
        totalStockSummary,
        dateRange: {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
        },
    });
}
