'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
    ArrowLeft, ArrowRightLeft, ArrowRight, MapPin,
    CheckCircle2, XCircle, Package, Minus, Plus
} from 'lucide-react';
import { confirmTransferReceiving, cancelTransfer } from '@/actions/stock-transfer/transfer';
import { useToast } from '@/components/ui/toast';

interface ChannelInfo {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    location: string;
}

interface TransferItem {
    id: string;
    barcode: string;
    quantity: number;
    receivedQuantity: number;
    product: {
        name: string;
        code: string | null;
        size: string | null;
        color: string | null;
        producttype: string | null;
        price: number;
    };
}

interface Transfer {
    id: string;
    transferCode: string;
    fromChannel: ChannelInfo;
    toChannel: ChannelInfo;
    status: string;
    notes: string | null;
    cancelReason: string | null;
    items: TransferItem[];
    createdAt: string;
    shippedAt: string | null;
    receivedAt: string | null;
    cancelledAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
    shipped: { label: 'กำลังส่ง', color: 'bg-blue-100 text-blue-700', icon: '🚚' },
    received: { label: 'รับแล้ว', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: '❌' },
};

interface Props {
    readonly transfer: Transfer;
}

export function TransferDetailClient({ transfer }: Props) {
    const router = useRouter();
    const { toastError } = useToast();

    const [loading, setLoading] = useState<string | null>(null);
    const [showReceive, setShowReceive] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [receivingItems, setReceivingItems] = useState(
        transfer.items.map(item => ({
            barcode: item.barcode,
            sentQuantity: item.quantity,
            receivedQuantity: item.quantity, // default: receive all
        }))
    );

    const statusConf = STATUS_CONFIG[transfer.status] || { label: transfer.status, color: 'bg-slate-100 text-slate-700', icon: '📦' };
    const isActionable = ['pending', 'shipped'].includes(transfer.status);

    const totalSent = transfer.items.reduce((sum, i) => sum + i.quantity, 0);
    const totalReceiving = receivingItems.reduce((sum, i) => sum + i.receivedQuantity, 0);

    const updateReceivingQty = (barcode: string, qty: number) => {
        const item = transfer.items.find(i => i.barcode === barcode);
        if (!item) return;
        setReceivingItems(prev =>
            prev.map(i =>
                i.barcode === barcode
                    ? { ...i, receivedQuantity: Math.max(0, Math.min(qty, item.quantity)) }
                    : i
            )
        );
    };

    const handleConfirmReceive = async () => {
        setLoading('receive');
        try {
            await confirmTransferReceiving(transfer.id, receivingItems);
            router.refresh();
            setShowReceive(false);
        } catch (err) {
            toastError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(null);
        }
    };

    const handleCancel = async () => {
        setLoading('cancel');
        try {
            await cancelTransfer(transfer.id, cancelReason || undefined);
            router.refresh();
            setShowCancel(false);
        } catch (err) {
            toastError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/warehouse/stock-transfer" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                            <h1 className="text-2xl font-bold text-slate-900">{transfer.transferCode}</h1>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConf.color}`}>
                                {statusConf.icon} {statusConf.label}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            สร้างเมื่อ {format(new Date(transfer.createdAt), 'd MMMM yyyy HH:mm', { locale: th })}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Channel Flow */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">ต้นทาง</p>
                                <p className="font-semibold text-slate-900 text-sm">{transfer.fromChannel.name}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3" /> {transfer.fromChannel.location}
                                </p>
                                <Link href={`/channels/${transfer.fromChannel.id}`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                                    ดูรายละเอียด →
                                </Link>
                            </div>
                            <ArrowRight className="h-5 w-5 text-indigo-400" />
                            <div>
                                <p className="text-xs text-slate-500 mb-1">ปลายทาง</p>
                                <p className="font-semibold text-slate-900 text-sm">{transfer.toChannel.name}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3" /> {transfer.toChannel.location}
                                </p>
                                <Link href={`/channels/${transfer.toChannel.id}`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                                    ดูรายละเอียด →
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                        <h2 className="text-sm font-semibold text-slate-700 mb-3">
                            รายการสินค้า ({transfer.items.length} รายการ, {totalSent.toLocaleString()} ชิ้น)
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-slate-500 border-b border-slate-100">
                                        <th className="text-left py-2 pr-2">สินค้า</th>
                                        <th className="text-center py-2 px-2">ไซส์</th>
                                        <th className="text-center py-2 px-2">สี</th>
                                        <th className="text-right py-2 px-2">จำนวนส่ง</th>
                                        {transfer.status === 'received' && (
                                            <th className="text-right py-2 pl-2">จำนวนรับ</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transfer.items.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="py-2.5 pr-2">
                                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                                <p className="text-xs text-slate-400">{item.barcode}</p>
                                            </td>
                                            <td className="text-center py-2.5 px-2 text-slate-600">{item.product.size || '-'}</td>
                                            <td className="text-center py-2.5 px-2 text-slate-600">{item.product.color || '-'}</td>
                                            <td className="text-right py-2.5 px-2 font-medium text-slate-900">{item.quantity}</td>
                                            {transfer.status === 'received' && (
                                                <td className={`text-right py-2.5 pl-2 font-medium ${
                                                    item.receivedQuantity < item.quantity ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                    {item.receivedQuantity}
                                                    {item.receivedQuantity < item.quantity && (
                                                        <span className="text-xs text-red-400 ml-1">
                                                            (-{item.quantity - item.receivedQuantity})
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    {transfer.notes && (
                        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
                            <h2 className="text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</h2>
                            <p className="text-sm text-slate-600">{transfer.notes}</p>
                        </div>
                    )}

                    {/* Cancel Reason */}
                    {transfer.cancelReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                            <h2 className="text-sm font-semibold text-red-700 mb-2">เหตุผลที่ยกเลิก</h2>
                            <p className="text-sm text-red-600">{transfer.cancelReason}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar: Actions */}
                <div className="space-y-4">
                    {/* Action Buttons */}
                    {isActionable && (
                        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700">ดำเนินการ</h3>

                            {/* Confirm Receive */}
                            {!showReceive ? (
                                <button
                                    onClick={() => setShowReceive(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors"
                                >
                                    <CheckCircle2 className="h-4 w-4" /> ยืนยันรับสินค้า
                                </button>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-3">
                                    <p className="text-xs font-medium text-emerald-800">กรอกจำนวนที่รับได้จริง</p>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {receivingItems.map(item => {
                                            const transferItem = transfer.items.find(i => i.barcode === item.barcode);
                                            if (!transferItem) return null;
                                            return (
                                                <div key={item.barcode} className="flex items-center justify-between gap-2 py-1.5">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-slate-800 truncate">{transferItem.product.name}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {transferItem.product.size && `${transferItem.product.size} `}
                                                            {transferItem.product.color && `${transferItem.product.color} `}
                                                            | ส่ง {item.sentQuantity}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateReceivingQty(item.barcode, item.receivedQuantity - 1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            value={item.receivedQuantity}
                                                            onChange={e => updateReceivingQty(item.barcode, parseInt(e.target.value) || 0)}
                                                            onFocus={e => e.target.select()}
                                                            className="w-14 text-center border border-slate-200 rounded px-1 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={() => updateReceivingQty(item.barcode, item.receivedQuantity + 1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-xs text-emerald-700 font-medium">
                                        รวมรับ: {totalReceiving.toLocaleString()} / {totalSent.toLocaleString()} ชิ้น
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleConfirmReceive}
                                            disabled={loading === 'receive'}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {loading === 'receive' ? 'กำลังบันทึก...' : 'ยืนยันรับ'}
                                        </button>
                                        <button onClick={() => setShowReceive(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
                                            ยกเลิก
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Cancel Transfer */}
                            {!showCancel ? (
                                <button
                                    onClick={() => setShowCancel(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                                >
                                    <XCircle className="h-4 w-4" /> ยกเลิกใบโอน
                                </button>
                            ) : (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
                                    <p className="text-xs font-medium text-red-700">
                                        ⚠️ Stock จะถูกคืนกลับไปยัง {transfer.fromChannel.name}
                                    </p>
                                    <input
                                        type="text"
                                        value={cancelReason}
                                        onChange={e => setCancelReason(e.target.value)}
                                        placeholder="เหตุผลที่ยกเลิก (ไม่บังคับ)"
                                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            disabled={loading === 'cancel'}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
                                        >
                                            {loading === 'cancel' ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                                        </button>
                                        <button onClick={() => setShowCancel(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
                                            ไม่ยกเลิก
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Info */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">สถานะ</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">สถานะ</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.color}`}>
                                    {statusConf.label}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">สร้างเมื่อ</span>
                                <span className="text-slate-900">{format(new Date(transfer.createdAt), 'd MMM yy HH:mm', { locale: th })}</span>
                            </div>
                            {transfer.receivedAt && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">รับเมื่อ</span>
                                    <span className="text-emerald-700">{format(new Date(transfer.receivedAt), 'd MMM yy HH:mm', { locale: th })}</span>
                                </div>
                            )}
                            {transfer.cancelledAt && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">ยกเลิกเมื่อ</span>
                                    <span className="text-red-600">{format(new Date(transfer.cancelledAt), 'd MMM yy HH:mm', { locale: th })}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">สรุป</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">จำนวนรายการ</span>
                                <span className="text-slate-900">{transfer.items.length} SKU</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">จำนวนส่งทั้งหมด</span>
                                <span className="text-slate-900">{totalSent.toLocaleString()} ชิ้น</span>
                            </div>
                            {transfer.status === 'received' && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">จำนวนรับจริง</span>
                                        <span className="text-emerald-700 font-medium">
                                            {transfer.items.reduce((sum, i) => sum + i.receivedQuantity, 0).toLocaleString()} ชิ้น
                                        </span>
                                    </div>
                                    {totalSent !== transfer.items.reduce((sum, i) => sum + i.receivedQuantity, 0) && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">สูญหาย/ชำรุด</span>
                                            <span className="text-red-600 font-medium">
                                                {(totalSent - transfer.items.reduce((sum, i) => sum + i.receivedQuantity, 0)).toLocaleString()} ชิ้น
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
