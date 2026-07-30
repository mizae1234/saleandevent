import { getStockTransferById } from '@/actions/stock-transfer/queries';
import { notFound } from 'next/navigation';
import { TransferDetailClient } from './TransferDetailClient';

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const transfer = await getStockTransferById(id);

    if (!transfer) notFound();

    return <TransferDetailClient transfer={transfer} />;
}
