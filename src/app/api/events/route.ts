import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const events = await db.event.findMany({
            orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
        });

        // Map to plain objects with serializable dates
        const result = events.map(e => ({
            id: e.id,
            code: e.code,
            name: e.name,
            location: e.location,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate.toISOString(),
            status: e.status,
            responsiblePersonId: e.responsiblePersonId,
            responsiblePersonName: e.responsiblePersonName,
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch events:", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}
