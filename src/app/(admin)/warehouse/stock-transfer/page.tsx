import { getStockTransfers } from '@/actions/stock-transfer/queries';
import { StockTransferListClient } from './StockTransferListClient';

export default async function StockTransferPage() {
    const transfers = await getStockTransfers();

    return <StockTransferListClient transfers={transfers} />;
}
