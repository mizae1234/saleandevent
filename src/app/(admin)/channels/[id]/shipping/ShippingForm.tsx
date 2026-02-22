'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createShipment } from '@/actions/stock-request-actions';
import { Truck, Send } from 'lucide-react';

interface Props {
    readonly requestId: string;
    readonly packedTotal: number;
}

export default function ShippingForm({ requestId, packedTotal }: Props) {
    const router = useRouter();
    const [provider, setProvider] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider.trim()) return;

        setLoading(true);
        try {
            await createShipment(requestId, provider, trackingNumber);
            router.refresh();
            router.push('/warehouse/shipments');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <p className="text-sm text-blue-800">จำนวนที่แพ็ค: <strong>{packedTotal} ชิ้น</strong></p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ขนส่ง *</label>
                <input
                    type="text"
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    placeholder="เช่น Kerry, Flash, J&T"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เลขพัสดุ</label>
                <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="Tracking number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors"
                />
            </div>

            <button
                type="submit"
                disabled={loading || !provider.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                <Send className="h-4 w-4" /> {loading ? 'กำลังสร้าง...' : 'สร้างใบจัดส่ง'}
            </button>
        </form>
    );
}
