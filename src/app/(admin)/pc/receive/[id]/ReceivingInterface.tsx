'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { confirmReceiving } from '@/actions/stock-request-actions';
import { CheckCircle2, AlertTriangle, Package, ClipboardCheck } from 'lucide-react';

interface Allocation {
    barcode: string;
    size: string | null;
    packedQuantity: number;
    product: { name: string; code: string | null; color: string | null; producttype: string | null };
}

interface Props {
    readonly requestId: string;
    readonly allocations: Allocation[];
    readonly redirectTo?: string;
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface GroupedRow {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, { barcode: string; allocated: number }>;
    total: number;
}

export default function ReceivingInterface({ requestId, allocations, redirectTo }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'shipped' | 'receive'>('receive');
    const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        allocations.forEach(a => { map[a.barcode] = a.packedQuantity; });
        return map;
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.packedQuantity, 0);
    const totalReceived = Object.values(receivedQtys).reduce((sum, q) => sum + q, 0);
    const hasDifference = totalAllocated !== totalReceived;

    // Group allocations by code + color
    const groupedRows: GroupedRow[] = useMemo(() => {
        const map = new Map<string, GroupedRow>();
        let counter = 0;

        for (const a of allocations) {
            const key = `${a.product.code || a.barcode}__${a.product.color || ''}`;
            let row = map.get(key);
            if (!row) {
                counter++;
                row = {
                    no: counter,
                    producttype: a.product.producttype || a.product.name || '',
                    code: a.product.code || a.barcode,
                    color: a.product.color || '-',
                    sizes: {},
                    total: 0,
                };
                map.set(key, row);
            }
            if (a.size) {
                row.sizes[a.size] = {
                    barcode: a.barcode,
                    allocated: a.packedQuantity,
                };
            }
            row.total += a.packedQuantity;
        }

        return Array.from(map.values());
    }, [allocations]);

    // Size totals
    const sizeTotalsAllocated = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of SIZES) {
            totals[s] = groupedRows.reduce((sum, r) => sum + (r.sizes[s]?.allocated || 0), 0);
        }
        return totals;
    }, [groupedRows]);

    const sizeTotalsReceived = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of SIZES) {
            totals[s] = groupedRows.reduce((sum, r) => {
                const barcode = r.sizes[s]?.barcode;
                return sum + (barcode ? (receivedQtys[barcode] || 0) : 0);
            }, 0);
        }
        return totals;
    }, [groupedRows, receivedQtys]);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            // Deduplicate items by barcode (prevent duplicate submission)
            const itemsMap = new Map<string, { barcode: string; allocatedQty: number; receivedQty: number }>();
            for (const a of allocations) {
                if (!itemsMap.has(a.barcode)) {
                    itemsMap.set(a.barcode, {
                        barcode: a.barcode,
                        allocatedQty: a.packedQuantity,
                        receivedQty: receivedQtys[a.barcode] || 0,
                    });
                } else {
                    const existing = itemsMap.get(a.barcode)!;
                    existing.allocatedQty += a.packedQuantity;
                }
            }
            const items = Array.from(itemsMap.values());

            await confirmReceiving(requestId, items);
            router.push(redirectTo || '/pc/receive');
            router.refresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { key: 'receive' as const, label: 'รับสินค้า', icon: ClipboardCheck },
        { key: 'shipped' as const, label: 'จำนวนที่ส่ง', icon: Package },
    ];

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

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                            ? 'border-indigo-600 text-indigo-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'shipped' && (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-10">#</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">ประเภท</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">รุ่น</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">สี</th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center p-3 text-xs font-semibold text-slate-600 w-14">{s}</th>
                                ))}
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-16">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedRows.map(row => (
                                <tr key={`${row.code}-${row.color}`} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-400">{row.no}</td>
                                    <td className="p-3 text-slate-700">{row.producttype}</td>
                                    <td className="p-3 font-semibold text-indigo-700">{row.code}</td>
                                    <td className="p-3 text-center text-slate-700">{row.color}</td>
                                    {SIZES.map(s => (
                                        <td key={s} className="p-3 text-center">
                                            {row.sizes[s] ? (
                                                <span className="font-medium text-slate-900">{row.sizes[s].allocated}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center font-bold text-slate-900">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                            <tr>
                                <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                                {SIZES.map(s => (
                                    <td key={s} className="p-3 text-center font-bold text-slate-700">
                                        {sizeTotalsAllocated[s] > 0 ? sizeTotalsAllocated[s] : '-'}
                                    </td>
                                ))}
                                <td className="p-3 text-center font-bold text-indigo-700 text-base">{totalAllocated}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {activeTab === 'receive' && (
                <>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                        <table className="w-full text-sm">
                            <thead className="bg-emerald-50">
                                <tr>
                                    <th className="text-center p-3 text-xs font-semibold text-emerald-700 w-10">#</th>
                                    <th className="text-left p-3 text-xs font-semibold text-emerald-700">รุ่น</th>
                                    <th className="text-center p-3 text-xs font-semibold text-emerald-700">สี</th>
                                    {SIZES.map(s => (
                                        <th key={s} className="text-center p-3 text-xs font-semibold text-emerald-700 w-14">{s}</th>
                                    ))}
                                    <th className="text-center p-3 text-xs font-semibold text-emerald-700 w-16">รวม</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedRows.map(row => {
                                    const receivedTotal = SIZES.reduce((sum, s) => {
                                        const barcode = row.sizes[s]?.barcode;
                                        return sum + (barcode ? (receivedQtys[barcode] || 0) : 0);
                                    }, 0);
                                    return (
                                        <tr key={`recv-${row.code}-${row.color}`} className="hover:bg-emerald-50/30">
                                            <td className="p-3 text-center text-slate-400">{row.no}</td>
                                            <td className="p-3 font-semibold text-indigo-700">{row.code}</td>
                                            <td className="p-3 text-center text-slate-700">{row.color}</td>
                                            {SIZES.map(s => {
                                                const sizeInfo = row.sizes[s];
                                                if (!sizeInfo) {
                                                    return <td key={s} className="p-3 text-center text-slate-300">-</td>;
                                                }
                                                const received = receivedQtys[sizeInfo.barcode] || 0;
                                                const diff = sizeInfo.allocated - received;
                                                return (
                                                    <td key={s} className="p-2 text-center">
                                                        <input
                                                            type="number"
                                                            value={received}
                                                            onChange={e => setReceivedQtys(prev => ({
                                                                ...prev,
                                                                [sizeInfo.barcode]: parseInt(e.target.value) || 0,
                                                            }))}
                                                            min="0"
                                                            className={`w-14 border rounded px-1 py-1 text-center text-sm ${diff !== 0
                                                                ? 'border-amber-400 bg-amber-50 text-amber-700'
                                                                : 'border-slate-300 text-slate-900'
                                                                }`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="p-3 text-center font-bold text-slate-900">{receivedTotal}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-emerald-50 border-t-2 border-emerald-300">
                                <tr>
                                    <td colSpan={3} className="p-3 text-sm font-bold text-emerald-700">รวมรับจริง</td>
                                    {SIZES.map(s => (
                                        <td key={s} className="p-3 text-center font-bold text-emerald-700">
                                            {sizeTotalsReceived[s] > 0 ? sizeTotalsReceived[s] : '-'}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center font-bold text-emerald-700 text-base">{totalReceived}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Confirm */}
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                    >
                        <CheckCircle2 className="h-4 w-4" /> {loading ? 'กำลังยืนยัน...' : `ยืนยันรับสินค้า (${totalReceived} ชิ้น)`}
                    </button>
                </>
            )}
        </div>
    );
}
