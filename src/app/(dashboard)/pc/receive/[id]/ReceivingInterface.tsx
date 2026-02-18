'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmReceiving } from '@/actions/stock-request-actions';
import { CheckCircle2, Package, AlertTriangle } from 'lucide-react';

interface Allocation {
    barcode: string;
    size: string | null;
    packedQuantity: number;
    product: { name: string; code: string | null; color: string | null };
}

interface Props {
    readonly requestId: string;
    readonly allocations: Allocation[];
}

export default function ReceivingInterface({ requestId, allocations }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        allocations.forEach(a => { map[a.barcode] = a.packedQuantity; });
        return map;
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.packedQuantity, 0);
    const totalReceived = Object.values(receivedQtys).reduce((sum, q) => sum + q, 0);
    const hasDifference = totalAllocated !== totalReceived;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const items = allocations.map(a => ({
                barcode: a.barcode,
                allocatedQty: a.packedQuantity,
                receivedQty: receivedQtys[a.barcode] || 0,
            }));
            await confirmReceiving(requestId, items);
            router.push('/pc/receive');
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div>
                    <p className="text-xs text-slate-500">จัดส่ง / รับจริง</p>
                    <p className="text-lg font-bold text-slate-900">{totalAllocated} → {totalReceived} ชิ้น</p>
                </div>
                {hasDifference && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm">
                        <AlertTriangle className="h-4 w-4" /> มีส่วนต่าง
                    </span>
                )}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left p-3 text-xs font-medium text-slate-500">สินค้า</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500">จัดส่ง</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500">รับจริง</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500">ต่าง</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allocations.map(a => {
                            const received = receivedQtys[a.barcode] || 0;
                            const diff = a.packedQuantity - received;
                            return (
                                <tr key={a.barcode}>
                                    <td className="p-3">
                                        <p className="font-medium text-slate-900">{a.product.name}</p>
                                        <p className="text-xs text-slate-400">{a.barcode} {a.size && `· ${a.size}`}</p>
                                    </td>
                                    <td className="p-3 text-center font-medium">{a.packedQuantity}</td>
                                    <td className="p-3 text-center">
                                        <input
                                            type="number"
                                            value={received}
                                            onChange={e => setReceivedQtys(prev => ({ ...prev, [a.barcode]: parseInt(e.target.value) || 0 }))}
                                            min="0"
                                            className="w-20 border border-slate-300 rounded px-2 py-1 text-center text-sm"
                                        />
                                    </td>
                                    <td className={`p-3 text-center font-medium ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                        {diff === 0 ? '✓' : diff > 0 ? `-${diff}` : `+${Math.abs(diff)}`}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Confirm */}
            <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
                <CheckCircle2 className="h-4 w-4" /> {loading ? 'กำลังยืนยัน...' : 'ยืนยันรับสินค้า'}
            </button>
        </div>
    );
}
