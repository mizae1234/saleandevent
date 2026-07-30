'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, ArrowRight, Search, Plus, Minus, Send, Package } from 'lucide-react';
import { getAvailableStock } from '@/actions/stock-transfer/queries';
import { createStockTransfer } from '@/actions/stock-transfer/transfer';
import { useToast } from '@/components/ui/toast';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Channel {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
    location: string;
    startDate: string | null;
    endDate: string | null;
    totalRemaining: number;
}

interface StockItem {
    barcode: string;
    quantity: number;
    soldQuantity: number;
    remaining: number;
    product: {
        code: string | null;
        name: string;
        size: string | null;
        color: string | null;
        producttype: string | null;
    };
}

interface SelectedItem {
    barcode: string;
    quantity: number;
    maxQuantity: number;
    product: StockItem['product'];
}

interface Props {
    readonly channels: Channel[];
}

export function NewTransferClient({ channels }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toastError } = useToast();

    const preselectedFrom = searchParams.get('from');

    const [fromChannelId, setFromChannelId] = useState(preselectedFrom || '');
    const [toChannelId, setToChannelId] = useState('');
    const [availableStock, setAvailableStock] = useState<StockItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [stockLoading, setStockLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    // Load stock when source channel changes
    const loadStock = useCallback(async (channelId: string) => {
        if (!channelId) {
            setAvailableStock([]);
            setSelectedItems([]);
            return;
        }
        setStockLoading(true);
        try {
            const stock = await getAvailableStock(channelId);
            setAvailableStock(stock);
            setSelectedItems([]);
        } catch {
            toastError('ไม่สามารถโหลด Stock ได้');
        } finally {
            setStockLoading(false);
        }
    }, [toastError]);

    useEffect(() => {
        if (fromChannelId) {
            loadStock(fromChannelId);
        }
    }, [fromChannelId, loadStock]);

    const fromChannel = channels.find(c => c.id === fromChannelId);
    const toChannel = channels.find(c => c.id === toChannelId);

    // Filter destination channels (exclude source)
    const destinationChannels = channels.filter(c => c.id !== fromChannelId);

    // Filter stock by search
    const filteredStock = availableStock.filter(s => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            s.barcode.toLowerCase().includes(term) ||
            s.product.name.toLowerCase().includes(term) ||
            (s.product.code && s.product.code.toLowerCase().includes(term)) ||
            (s.product.color && s.product.color.toLowerCase().includes(term)) ||
            (s.product.size && s.product.size.toLowerCase().includes(term))
        );
    });

    const toggleItem = (stock: StockItem) => {
        const exists = selectedItems.find(i => i.barcode === stock.barcode);
        if (exists) {
            setSelectedItems(prev => prev.filter(i => i.barcode !== stock.barcode));
        } else {
            setSelectedItems(prev => [
                ...prev,
                { barcode: stock.barcode, quantity: stock.remaining, maxQuantity: stock.remaining, product: stock.product },
            ]);
        }
    };

    const updateQuantity = (barcode: string, qty: number) => {
        setSelectedItems(prev =>
            prev.map(i =>
                i.barcode === barcode
                    ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxQuantity)) }
                    : i
            )
        );
    };

    const selectAll = () => {
        if (selectedItems.length === filteredStock.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(
                filteredStock.map(s => ({
                    barcode: s.barcode,
                    quantity: s.remaining,
                    maxQuantity: s.remaining,
                    product: s.product,
                }))
            );
        }
    };

    const totalQuantity = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

    const handleSubmit = async () => {
        if (!fromChannelId || !toChannelId || selectedItems.length === 0) return;

        setLoading(true);
        try {
            const result = await createStockTransfer(
                fromChannelId,
                toChannelId,
                selectedItems.map(i => ({ barcode: i.barcode, quantity: i.quantity })),
                notes || undefined,
            );
            router.push(`/warehouse/stock-transfer/${result.id}`);
        } catch (err) {
            toastError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
            setShowConfirm(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/warehouse/stock-transfer" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ
                </Link>
                <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                    <h1 className="text-2xl font-bold text-slate-900">สร้างใบโอนย้าย Stock</h1>
                </div>
            </div>

            {/* Step 1: Select Channels */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mb-4">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">1. เลือกช่องทาง</h2>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                    {/* Source */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">ต้นทาง (โอนออก)</label>
                        <SearchableSelect
                            options={channels.map(c => ({
                                value: c.id,
                                label: `[${c.code}] ${c.name}`,
                                sublabel: `📍 ${c.location} — คงเหลือ ${c.totalRemaining.toLocaleString()} ชิ้น`,
                            }))}
                            value={fromChannelId}
                            onChange={(val) => {
                                setFromChannelId(val);
                                if (val === toChannelId) setToChannelId('');
                            }}
                            placeholder="-- เลือก Channel ต้นทาง --"
                        />
                        {fromChannel && (
                            <p className="text-xs text-slate-400 mt-1">📍 {fromChannel.location}</p>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center pt-5">
                        <ArrowRight className="h-5 w-5 text-indigo-400" />
                    </div>

                    {/* Destination */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">ปลายทาง (โอนเข้า)</label>
                        <SearchableSelect
                            options={destinationChannels.map(c => ({
                                value: c.id,
                                label: `[${c.code}] ${c.name}`,
                                sublabel: `📍 ${c.location}`,
                            }))}
                            value={toChannelId}
                            onChange={setToChannelId}
                            placeholder="-- เลือก Channel ปลายทาง --"
                            disabled={!fromChannelId}
                        />
                        {toChannel && (
                            <p className="text-xs text-slate-400 mt-1">📍 {toChannel.location}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Step 2: Select Items */}
            {fromChannelId && toChannelId && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-700">
                            2. เลือกสินค้า ({availableStock.length} รายการ)
                        </h2>
                        {availableStock.length > 0 && (
                            <button onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-700">
                                {selectedItems.length === filteredStock.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="ค้นหา barcode, ชื่อ, รหัส, สี..."
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                        />
                    </div>

                    {stockLoading ? (
                        <div className="text-center py-8 text-slate-400 text-sm">กำลังโหลด Stock...</div>
                    ) : availableStock.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">ไม่มี Stock คงเหลือใน Channel นี้</div>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                            {filteredStock.map(stock => {
                                const selected = selectedItems.find(i => i.barcode === stock.barcode);
                                return (
                                    <div key={stock.barcode} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors ${selected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleItem(stock)}
                                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                                            }`}
                                        >
                                            {selected && <span className="text-xs">✓</span>}
                                        </button>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-900 truncate">{stock.product.name}</span>
                                                {stock.product.size && (
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{stock.product.size}</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 flex gap-2">
                                                {stock.product.code && <span>{stock.product.code}</span>}
                                                {stock.product.color && <span>สี {stock.product.color}</span>}
                                                <span>คงเหลือ {stock.remaining}</span>
                                            </div>
                                        </div>

                                        {/* Quantity Control */}
                                        {selected && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateQuantity(stock.barcode, selected.quantity - 1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={selected.quantity}
                                                    onChange={e => updateQuantity(stock.barcode, parseInt(e.target.value) || 0)}
                                                    onFocus={e => e.target.select()}
                                                    min={1}
                                                    max={stock.remaining}
                                                    className="w-16 text-center border border-slate-200 rounded px-1 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                                                />
                                                <button
                                                    onClick={() => updateQuantity(stock.barcode, selected.quantity + 1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Notes + Submit */}
            {selectedItems.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 mb-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">3. หมายเหตุ (ไม่บังคับ)</h2>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="เช่น โอนหลังจบ Event A เพื่อเตรียม Event B..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none resize-none"
                    />
                </div>
            )}

            {/* Summary + Submit */}
            {selectedItems.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-semibold text-indigo-900">
                                สรุป: โอน {selectedItems.length} รายการ รวม {totalQuantity.toLocaleString()} ชิ้น
                            </p>
                            <p className="text-xs text-indigo-600 mt-0.5">
                                {fromChannel?.name} → {toChannel?.name}
                            </p>
                        </div>
                        <Package className="h-8 w-8 text-indigo-300" />
                    </div>

                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                        >
                            <Send className="h-4 w-4" /> ยืนยันสร้างใบโอน
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-red-600 font-medium">
                                ⚠️ Stock จะถูกหักจาก {fromChannel?.name} ทันที คุณแน่ใจหรือไม่?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยัน โอนเลย'}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
