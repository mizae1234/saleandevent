'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStockRequest, submitStockRequest } from '@/actions/stock-request-actions';
import { ArrowLeft, Send, Package } from 'lucide-react';
import Link from 'next/link';

interface Channel {
    id: string;
    name: string;
    code: string;
}

interface Props {
    readonly channels: Channel[];
}

export default function NewRefillClient({ channels }: Props) {
    const router = useRouter();
    const [channelId, setChannelId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!channelId || !quantity || parseInt(quantity) <= 0) return;

        setLoading(true);
        try {
            const req = await createStockRequest(channelId, 'TOPUP', parseInt(quantity), notes || undefined);
            await submitStockRequest(req.id);
            router.push('/pc/refill');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <Link href="/pc/refill" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-6">
                <ArrowLeft className="h-4 w-4" /> กลับ
            </Link>

            <h1 className="text-xl font-bold text-slate-900 mb-1">ขอสินค้าเพิ่ม (Top-Up)</h1>
            <p className="text-sm text-slate-500 mb-6">ระบุ Sales Channel และจำนวนที่ต้องการ</p>

            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sales Channel *</label>
                    <select
                        value={channelId}
                        onChange={e => setChannelId(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                    >
                        <option value="">เลือก Channel...</option>
                        {channels.map(ch => (
                            <option key={ch.id} value={ch.id}>{ch.name} ({ch.code})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนสินค้าที่ต้องการ (ชิ้น) *</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        placeholder="เช่น 200"
                        min="1"
                        className="w-full border-0 border-b-2 border-slate-300 px-0 py-3 text-2xl font-bold focus:border-indigo-500 focus:ring-0"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="เช่น ต้องการเน้นไซส์ M-L"
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || !channelId || !quantity}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                >
                    <Send className="h-4 w-4" /> {loading ? 'กำลังส่ง...' : 'ส่งคำขอ'}
                </button>
            </div>
        </div>
    );
}
