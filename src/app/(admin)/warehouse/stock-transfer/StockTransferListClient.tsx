'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, ArrowRightLeft, Plus, Package, ArrowRight, Search, X } from 'lucide-react';

interface TransferChannel {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
}

interface TransferItemSummary {
    barcode?: string;
    name: string;
    code: string | null;
    sku?: string | null;
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
    itemsSummary?: TransferItemSummary[];
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
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter by search query first
    const searchMatchedTransfers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return transfers;

        return transfers.filter(transfer => {
            // Match transfer code
            if (transfer.transferCode?.toLowerCase().includes(q)) return true;

            // Match origin channel
            if (
                transfer.fromChannel?.name?.toLowerCase().includes(q) ||
                transfer.fromChannel?.code?.toLowerCase().includes(q)
            ) return true;

            // Match destination channel
            if (
                transfer.toChannel?.name?.toLowerCase().includes(q) ||
                transfer.toChannel?.code?.toLowerCase().includes(q)
            ) return true;

            // Match notes
            if (transfer.notes?.toLowerCase().includes(q)) return true;

            // Match items (barcode, code, name, sku)
            if (transfer.itemsSummary?.some(item =>
                item.name?.toLowerCase().includes(q) ||
                item.code?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.barcode?.toLowerCase().includes(q)
            )) return true;

            return false;
        });
    }, [transfers, search]);

    // Apply status filter
    const filteredTransfers = useMemo(() => {
        if (statusFilter === 'all') return searchMatchedTransfers;
        return searchMatchedTransfers.filter(t => t.status === statusFilter);
    }, [searchMatchedTransfers, statusFilter]);

    // Status counts based on current search filter
    const statusCounts = useMemo(() => ({
        all: searchMatchedTransfers.length,
        pending: searchMatchedTransfers.filter(t => t.status === 'pending').length,
        shipped: searchMatchedTransfers.filter(t => t.status === 'shipped').length,
        received: searchMatchedTransfers.filter(t => t.status === 'received').length,
        cancelled: searchMatchedTransfers.filter(t => t.status === 'cancelled').length,
    }), [searchMatchedTransfers]);

    const hasActiveFilter = search.trim() !== '' || statusFilter !== 'all';

    const handleClearFilters = () => {
        setSearch('');
        setStatusFilter('all');
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" /> สร้างใบโอน
                    </Link>
                </div>
            </div>

            {/* Search & Status Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm space-y-3">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขที่ใบโอน, สาขาต้นทาง-ปลายทาง, สินค้า, หรือหมายเหตุ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label="ล้างคำค้นหา"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Status Tabs & Count Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="flex gap-1.5 flex-wrap">
                        {Object.entries({
                            all: 'ทั้งหมด',
                            pending: 'รอดำเนินการ',
                            shipped: 'กำลังส่ง',
                            received: 'รับแล้ว',
                            cancelled: 'ยกเลิก',
                        }).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                                    statusFilter === key
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {label} ({statusCounts[key as keyof typeof statusCounts]})
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                        <span>
                            พบ <strong className="text-slate-800">{filteredTransfers.length}</strong> จาก {transfers.length} รายการ
                        </span>
                        {hasActiveFilter && (
                            <button
                                onClick={handleClearFilters}
                                className="text-indigo-600 hover:text-indigo-800 font-medium underline ml-1"
                            >
                                ล้างตัวกรอง
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Transfer List */}
            {filteredTransfers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
                    <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    {hasActiveFilter ? (
                        <div>
                            <p className="text-slate-700 font-medium mb-1">ไม่พบรายการโอนย้ายที่ค้นหา</p>
                            <p className="text-sm text-slate-400 mb-4">ลองค้นหาด้วยคำอื่น หรือกดล้างตัวกรอง</p>
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                ล้างตัวกรองทั้งหมด
                            </button>
                        </div>
                    ) : (
                        <p className="text-slate-500">ยังไม่มีรายการโอนย้าย</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTransfers.map(transfer => {
                        const statusConf = STATUS_CONFIG[transfer.status] || { label: transfer.status, color: 'bg-slate-100 text-slate-700' };

                        // Check if search matched specific items to show preview
                        const trimmedSearch = search.trim().toLowerCase();
                        const matchedItems = trimmedSearch && transfer.itemsSummary
                            ? transfer.itemsSummary.filter(i =>
                                i.name?.toLowerCase().includes(trimmedSearch) ||
                                i.code?.toLowerCase().includes(trimmedSearch) ||
                                i.sku?.toLowerCase().includes(trimmedSearch) ||
                                i.barcode?.toLowerCase().includes(trimmedSearch)
                            )
                            : [];

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
                                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                    <span>{transfer.totalItems} รายการ</span>
                                    <span>จำนวน {transfer.totalQuantity.toLocaleString()} ชิ้น</span>
                                    {transfer.status === 'received' && (
                                        <span className="text-emerald-600 font-medium">รับแล้ว {transfer.totalReceived.toLocaleString()} ชิ้น</span>
                                    )}
                                    {transfer.notes && (
                                        <span className="text-slate-400 truncate max-w-[250px]">หมายเหตุ: {transfer.notes}</span>
                                    )}
                                </div>
                                {matchedItems.length > 0 && (
                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
                                        <span className="text-slate-400 font-medium">สินค้าที่ตรงกัน:</span>
                                        {matchedItems.slice(0, 3).map((item, idx) => (
                                            <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-[11px]">
                                                {item.code ? `[${item.code}] ` : ''}{item.name}{item.sku ? ` (${item.sku})` : ''}
                                            </span>
                                        ))}
                                        {matchedItems.length > 3 && (
                                            <span className="text-slate-400 text-[11px]">+{matchedItems.length - 3} รายการ</span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
