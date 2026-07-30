'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, ArrowRightLeft, Plus, Package, ArrowRight } from 'lucide-react';

interface TransferChannel {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
}

interface Transfer {
    id: string;
    transferCode: string;
    fromChannel: TransferChannel;
    toChannel: TransferChannel;
    status: string;
    notes: string | null;
    totalItems: number;
    totalQuantity: number;
    totalReceived: number;
    createdAt: string;
    shippedAt: string | null;
    receivedAt: string | null;
    cancelledAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending: { label: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-700' },
    shipped: { label: 'กำลังส่ง', color: 'bg-blue-100 text-blue-700' },
    received: { label: 'รับแล้ว', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
};

interface Props {
    readonly transfers: Transfer[];
}

export function StockTransferListClient({ transfers }: Props) {
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredTransfers = statusFilter === 'all'
        ? transfers
        : transfers.filter(t => t.status === statusFilter);

    const statusCounts = {
        all: transfers.length,
        pending: transfers.filter(t => t.status === 'pending').length,
        shipped: transfers.filter(t => t.status === 'shipped').length,
        received: transfers.filter(t => t.status === 'received').length,
        cancelled: transfers.filter(t => t.status === 'cancelled').length,
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/channels" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                        <h1 className="text-2xl font-bold text-slate-900">โอนย้าย Stock</h1>
                    </div>
                    <Link
                        href="/warehouse/stock-transfer/new"
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" /> สร้างใบโอน
                    </Link>
                </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {Object.entries({ all: 'ทั้งหมด', pending: 'รอดำเนินการ', shipped: 'กำลังส่ง', received: 'รับแล้ว', cancelled: 'ยกเลิก' }).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            statusFilter === key
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {label} ({statusCounts[key as keyof typeof statusCounts]})
                    </button>
                ))}
            </div>

            {/* Transfer List */}
            {filteredTransfers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">ยังไม่มีรายการโอนย้าย</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTransfers.map(transfer => {
                        const statusConf = STATUS_CONFIG[transfer.status] || { label: transfer.status, color: 'bg-slate-100 text-slate-700' };
                        return (
                            <Link
                                key={transfer.id}
                                href={`/warehouse/stock-transfer/${transfer.id}`}
                                className="block bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md transition-shadow p-4"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-slate-900 text-sm">{transfer.transferCode}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConf.color}`}>
                                                {statusConf.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="font-medium">{transfer.fromChannel.name}</span>
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="font-medium">{transfer.toChannel.name}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                        {format(new Date(transfer.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span>{transfer.totalItems} รายการ</span>
                                    <span>จำนวน {transfer.totalQuantity.toLocaleString()} ชิ้น</span>
                                    {transfer.status === 'received' && (
                                        <span className="text-emerald-600">รับแล้ว {transfer.totalReceived.toLocaleString()} ชิ้น</span>
                                    )}
                                    {transfer.notes && (
                                        <span className="text-slate-400 truncate max-w-[200px]">หมายเหตุ: {transfer.notes}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
