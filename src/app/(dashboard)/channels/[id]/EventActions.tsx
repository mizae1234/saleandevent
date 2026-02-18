'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { closeChannelStock, createReturnShipment, confirmReturnReceived, closeChannelManual, submitChannel, approveChannel } from '@/actions/channel-actions';
import { createStockRequest, submitStockRequest } from '@/actions/stock-request-actions';
import { Package, Truck, RotateCcw, CheckCircle2, Plus, Send, ArrowRight } from 'lucide-react';

interface Props {
    readonly channel: {
        id: string;
        type: string;
        status: string;
        name: string;
    };
}

export default function EventActions({ channel }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [topUpQty, setTopUpQty] = useState('');
    const [showTopUp, setShowTopUp] = useState(false);

    const handleAction = async (actionName: string, action: () => Promise<void>) => {
        setLoading(actionName);
        try {
            await action();
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error occurred');
        } finally {
            setLoading(null);
        }
    };

    const handleCreateTopUp = async () => {
        const qty = parseInt(topUpQty);
        if (!qty || qty <= 0) return;

        await handleAction('topup', async () => {
            const req = await createStockRequest(channel.id, 'TOPUP', qty);
            await submitStockRequest(req.id);
            setShowTopUp(false);
            setTopUpQty('');
        });
    };

    return (
        <div className="space-y-3">
            {/* Submit Draft for Approval */}
            {channel.status === 'draft' && (
                <button
                    onClick={() => handleAction('submit', async () => {
                        await submitChannel(channel.id);
                    })}
                    disabled={loading === 'submit'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                    <Send className="h-4 w-4" /> {loading === 'submit' ? 'กำลังส่ง...' : 'ส่งอนุมัติ'}
                </button>
            )}

            {/* Approve Channel (draft or submitted) */}
            {['draft', 'submitted'].includes(channel.status) && (
                <button
                    onClick={() => handleAction('approve', async () => {
                        await approveChannel(channel.id);
                    })}
                    disabled={loading === 'approve'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                >
                    <CheckCircle2 className="h-4 w-4" /> {loading === 'approve' ? 'กำลังอนุมัติ...' : 'อนุมัติ'}
                </button>
            )}

            {/* Top-Up Request (active channels only) */}
            {channel.status === 'active' && (
                <div>
                    {!showTopUp ? (
                        <button
                            onClick={() => setShowTopUp(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" /> ขอสินค้าเพิ่ม (Top-Up)
                        </button>
                    ) : (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-3">
                            <p className="text-sm font-medium text-indigo-800">ระบุจำนวนที่ต้องการเพิ่ม</p>
                            <input
                                type="number"
                                value={topUpQty}
                                onChange={e => setTopUpQty(e.target.value)}
                                placeholder="จำนวนชิ้น"
                                min="1"
                                className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateTopUp}
                                    disabled={loading === 'topup'}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                    <Send className="h-3.5 w-3.5" /> ส่งคำขอ
                                </button>
                                <button onClick={() => setShowTopUp(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Close Stock (EVENT + active) */}
            {channel.type === 'EVENT' && channel.status === 'active' && (
                <button
                    onClick={() => router.push(`/pc/close/${channel.id}`)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                >
                    <Package className="h-4 w-4" /> ปิดสต็อก
                </button>
            )}

            {/* Create Return Shipment (pending_return) */}
            {channel.status === 'pending_return' && (
                <button
                    onClick={() => handleAction('return', async () => {
                        await createReturnShipment(channel.id, { provider: 'ขนส่ง' });
                    })}
                    disabled={loading === 'return'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                    <Truck className="h-4 w-4" /> สร้างใบส่งคืน
                </button>
            )}

            {/* Confirm Return (returning) */}
            {channel.status === 'returning' && (
                <button
                    onClick={() => handleAction('confirm-return', async () => {
                        await confirmReturnReceived(channel.id);
                    })}
                    disabled={loading === 'confirm-return'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                >
                    <RotateCcw className="h-4 w-4" /> ยืนยันรับคืนสินค้า
                </button>
            )}

            {/* Final Close (returned) */}
            {channel.status === 'returned' && (
                <button
                    onClick={() => handleAction('close', async () => {
                        await closeChannelManual(channel.id);
                    })}
                    disabled={loading === 'close'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium disabled:opacity-50"
                >
                    <CheckCircle2 className="h-4 w-4" /> ปิดงาน
                </button>
            )}
        </div>
    );
}
