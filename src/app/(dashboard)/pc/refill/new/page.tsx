import { getActiveEventsForRefill } from "@/actions/refill-actions";
import { db } from "@/lib/db";
import { NewRefillClient } from "./NewRefillClient";

export default async function NewRefillPage() {
    const [events, products] = await Promise.all([
        getActiveEventsForRefill(),
        db.product.findMany({
            where: { status: 'active' },
            select: {
                barcode: true,
                code: true,
                name: true,
                size: true,
                price: true,
            },
            orderBy: { name: 'asc' }
        })
    ]);

    return <NewRefillClient events={events} products={products} />;
}
