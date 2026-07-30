import { getTransferableChannels } from '@/actions/stock-transfer/queries';
import { NewTransferClient } from './NewTransferClient';

export default async function NewTransferPage() {
    const channels = await getTransferableChannels();

    return <NewTransferClient channels={channels} />;
}
