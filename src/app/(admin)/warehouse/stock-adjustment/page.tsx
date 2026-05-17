import { getChannelsWithStock } from "@/actions/stock-request/adjustment";
import { StockAdjustmentClient } from "./StockAdjustmentClient";

export default async function StockAdjustmentPage() {
    const channels = await getChannelsWithStock();

    return <StockAdjustmentClient channels={channels} />;
}
