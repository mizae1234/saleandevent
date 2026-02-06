import { getRefillRequests, getActiveEventsForRefill } from "@/actions/refill-actions";
import { RefillListClient } from "./RefillListClient";

export default async function RefillPage() {
    const [requests, events] = await Promise.all([
        getRefillRequests(),
        getActiveEventsForRefill()
    ]);

    return <RefillListClient requests={requests} events={events} />;
}
