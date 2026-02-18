'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveStockRequest, rejectStockRequest } from '@/actions/stock-request-actions';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
    readonly requestId: string;
}

export default function ApprovalActions({ requestId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [showReject, setShowReject] = useState(false);
    const [reason, setReason] = useState('');

    const handleApprove = async () => {
        setLoading('approve');
        try {
            await approveStockRequest(requestId);
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(null);
        }
    };

    const handleReject = async () => {
        setLoading('reject');
        try {
            await rejectStockRequest(requestId, reason);
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(null);
            setShowReject(false);
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
            {!showReject ? (
                <button
                    onClick={() => setShowReject(true)}
                    className="flex items-center gap-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                    <XCircle className="h-4 w-4" /> ปฏิเสธ
                </button>
            ) : (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="เหตุผล (ถ้ามี)"
                        className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleReject}
                        disabled={loading !== null}
                        className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                        {loading === 'reject' ? '...' : 'ยืนยันปฏิเสธ'}
                    </button>
                </div>
            )}
        </div>
    );
}
