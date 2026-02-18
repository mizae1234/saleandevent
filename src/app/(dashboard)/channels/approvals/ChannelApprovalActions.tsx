'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveChannel } from '@/actions/channel-actions';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
    readonly channelId: string;
}

export default function ChannelApprovalActions({ channelId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleApprove = async () => {
        setLoading('approve');
        try {
            await approveChannel(channelId);
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
                <CheckCircle2 className="h-4 w-4" /> {loading === 'approve' ? '...' : 'อนุมัติ'}
            </button>
        </div>
    );
}
