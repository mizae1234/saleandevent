import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const channelId = searchParams.get("channelId") || "all";
    const channelType = searchParams.get("channelType") || "all";

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

    const includeClosed = searchParams.get("includeClosed") === "true";
    const closedStatusFilter = !includeClosed
        ? Prisma.sql`AND sc.status NOT IN ('closed', 'completed', 'returned')`
        : Prisma.empty;

    // Query: Per-channel, per-product quantity breakdown
    const rows: any[] = await db.$queryRaw`
        SELECT 
            sc.name as channel_name,
            sc.code as channel_code,
            sc.type as channel_type,
            p.code as product_code,
            p.name as product_name,
            p.color as product_color,
            p.size as product_size,
            SUM(si.quantity) as qty_sold
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN sales_channels sc ON sc.id = s.channel_id AND sc.is_active = true
        JOIN products p ON p.barcode = si.barcode
        WHERE s.sold_at >= ${dateFrom} AND s.sold_at <= ${dateTo} 
            AND s.status = 'active'
            ${channelFilter}
            ${typeFilter}
            ${closedStatusFilter}
        GROUP BY sc.name, sc.code, sc.type, p.code, p.name, p.color, p.size
        ORDER BY sc.name ASC, SUM(si.quantity) DESC
    `;

    const data = rows.map((r) => ({
        channelName: r.channel_name,
        channelCode: r.channel_code,
        channelType: r.channel_type,
        productCode: r.product_code,
        productName: r.product_name,
        productColor: r.product_color || "-",
        productSize: r.product_size || "-",
        qtySold: Number(r.qty_sold),
    }));

    return NextResponse.json({ data });
}
