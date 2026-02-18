import { db } from "@/lib/db";
import NewRefillClient from "./NewRefillClient";

export default async function NewRefillPage() {
    const channels = await db.salesChannel.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
    });

    return (
        <NewRefillClient channels={channels.map(ch => ({
            id: ch.id,
            name: ch.name,
            code: ch.code,
        }))} />
    );
}
