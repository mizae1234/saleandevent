import { getPendingRefillRequests } from "@/actions/refill-actions";
import { RefillApprovalClient } from "./RefillApprovalClient";

export default async function RefillApprovalPage() {
    const requests = await getPendingRefillRequests();
    return <RefillApprovalClient requests={requests} />;
}
