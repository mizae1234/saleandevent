import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const channels = await db.salesChannel.findMany({
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });

        const result = channels.map(c => ({
            id: c.id,
            code: c.code,
            type: c.type,
            name: c.name,
            location: c.location,
            startDate: c.startDate?.toISOString() || null,
            endDate: c.endDate?.toISOString() || null,
            status: c.status,
            responsiblePersonId: c.responsiblePersonId,
            responsiblePersonName: c.responsiblePersonName,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch channels:", error);
        return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
    }
}
