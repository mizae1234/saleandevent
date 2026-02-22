"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { closeChannelStock } from "@/actions/channel-actions";

type StockItem = {
    barcode: string;
    productName: string;
    productCode: string | null;
    size: string | null;
    color: string | null;
    producttype: string | null;
    price: number;
    receivedQuantity: number;
    soldQuantity: number;
    remainingQuantity: number;
};

type CloseItem = {
    barcode: string;
    damaged: number;
    missing: number;
};

type Props = {
    channelId: string;
    eventName: string;
    stockDetails: StockItem[];
    redirectTo?: string;
};

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface GroupedRow {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, {
        barcode: string;
        received: number;
        sold: number;
        remaining: number;
    }>;
    totalReceived: number;
    totalSold: number;
    totalRemaining: number;
}

export function CloseEventClient({ channelId, eventName, stockDetails, redirectTo }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [closeItems, setCloseItems] = useState<Record<string, CloseItem>>(() => {
        const initial: Record<string, CloseItem> = {};
        stockDetails.forEach(item => {
            initial[item.barcode] = { barcode: item.barcode, damaged: 0, missing: 0 };
        });
        return initial;
    });
    const router = useRouter();

    // Group by code + color
    const groupedRows: GroupedRow[] = useMemo(() => {
        const map = new Map<string, GroupedRow>();
        let counter = 0;

        for (const item of stockDetails) {
            const key = `${item.productCode || item.barcode}__${item.color || ''}`;
            let row = map.get(key);
            if (!row) {
                counter++;
                row = {
                    no: counter,
                    producttype: item.producttype || item.productName || '',
                    code: item.productCode || item.barcode,
                    color: item.color || '-',
                    sizes: {},
                    totalReceived: 0,
                    totalSold: 0,
                    totalRemaining: 0,
                };
                map.set(key, row);
            }
            if (item.size) {
                row.sizes[item.size] = {
                    barcode: item.barcode,
                    received: item.receivedQuantity,
                    sold: item.soldQuantity,
                    remaining: item.remainingQuantity,
                };
            }
            row.totalReceived += item.receivedQuantity;
            row.totalSold += item.soldQuantity;
            row.totalRemaining += item.remainingQuantity;
        }

        return Array.from(map.values());
    }, [stockDetails]);

    // Size totals
    const sizeTotals = useMemo(() => {
        const totals: Record<string, { received: number; sold: number; remaining: number }> = {};
        for (const s of SIZES) {
            totals[s] = { received: 0, sold: 0, remaining: 0 };
            for (const r of groupedRows) {
                if (r.sizes[s]) {
                    totals[s].received += r.sizes[s].received;
                    totals[s].sold += r.sizes[s].sold;
                    totals[s].remaining += r.sizes[s].remaining;
                }
            }
        }
        return totals;
    }, [groupedRows]);

    const updateItem = (barcode: string, field: 'damaged' | 'missing', value: number) => {
        const item = stockDetails.find(s => s.barcode === barcode);
        if (!item) return;

        const otherField = field === 'damaged' ? 'missing' : 'damaged';
        const maxValue = item.remainingQuantity - closeItems[barcode][otherField];
        const clampedValue = Math.max(0, Math.min(value, maxValue));

        setCloseItems(prev => ({
            ...prev,
            [barcode]: { ...prev[barcode], [field]: clampedValue }
        }));
    };

    const handleSubmit = () => {
        setError("");

        const items = Object.values(closeItems).map(item => ({
            barcode: item.barcode,
            damaged: item.damaged,
            missing: item.missing
        }));

        startTransition(async () => {
            try {
                await closeChannelStock(channelId, items);
                router.push(redirectTo || `/pc/close/${channelId}/shipping`);
            } catch (e: any) {
                setError(e.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
            }
        });
    };

    // Calculate totals
    const totalDamaged = Object.values(closeItems).reduce((sum, item) => sum + item.damaged, 0);
    const totalMissing = Object.values(closeItems).reduce((sum, item) => sum + item.missing, 0);
    const totalRemaining = stockDetails.reduce((sum, s) => sum + s.remainingQuantity, 0);
    const totalReceived = stockDetails.reduce((sum, s) => sum + s.receivedQuantity, 0);
    const totalSold = stockDetails.reduce((sum, s) => sum + s.soldQuantity, 0);
    const totalReturn = totalRemaining - totalDamaged - totalMissing;

    const [activeTab, setActiveTab] = useState<'summary' | 'defects'>('summary');

    const tabs = [
        { key: 'summary' as const, label: 'สรุปสินค้า', icon: Package },
        { key: 'defects' as const, label: 'ชำรุด/สูญหาย', icon: AlertTriangle },
    ];

    return (
        <div className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

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

            {/* Tab: Summary - Grouped table */}
            {activeTab === 'summary' && (
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
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">รับมา</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">ขาย</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">คงเหลือ</th>
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
                                                <span className="font-medium text-slate-900">{row.sizes[s].remaining}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center text-slate-500">{row.totalReceived}</td>
                                    <td className="p-3 text-center text-blue-600 font-medium">{row.totalSold}</td>
                                    <td className="p-3 text-center font-bold text-emerald-700">{row.totalRemaining}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                            <tr>
                                <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                                {SIZES.map(s => (
                                    <td key={s} className="p-3 text-center font-bold text-slate-700">
                                        {sizeTotals[s].remaining > 0 ? sizeTotals[s].remaining : '-'}
                                    </td>
                                ))}
                                <td className="p-3 text-center font-bold text-slate-600">{totalReceived}</td>
                                <td className="p-3 text-center font-bold text-blue-600">{totalSold}</td>
                                <td className="p-3 text-center font-bold text-emerald-700 text-base">{totalRemaining}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Tab: Defects - Damage & Missing input */}
            {activeTab === 'defects' && (
                <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="bg-amber-50">
                            <tr>
                                <th className="text-center p-3 text-xs font-semibold text-amber-700 w-10">#</th>
                                <th className="text-left p-3 text-xs font-semibold text-amber-700">รุ่น</th>
                                <th className="text-center p-3 text-xs font-semibold text-amber-700">สี</th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center p-2 text-xs font-semibold text-amber-700 w-24" colSpan={1}>{s}</th>
                                ))}
                            </tr>
                            <tr className="bg-amber-50/50">
                                <th colSpan={3}></th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center px-1 pb-2 text-[10px] text-amber-600">
                                        ชำรุด / สูญหาย
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedRows.map(row => (
                                <tr key={`defect-${row.code}-${row.color}`} className="hover:bg-amber-50/30">
                                    <td className="p-3 text-center text-slate-400">{row.no}</td>
                                    <td className="p-3 font-semibold text-indigo-700">{row.code}</td>
                                    <td className="p-3 text-center text-slate-700">{row.color}</td>
                                    {SIZES.map(s => {
                                        const sizeInfo = row.sizes[s];
                                        if (!sizeInfo || sizeInfo.remaining <= 0) {
                                            return <td key={s} className="p-2 text-center text-slate-300">-</td>;
                                        }
                                        const ci = closeItems[sizeInfo.barcode];
                                        return (
                                            <td key={s} className="p-1 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={ci.damaged || ''}
                                                        placeholder="0"
                                                        onChange={e => updateItem(sizeInfo.barcode, 'damaged', parseInt(e.target.value) || 0)}
                                                        className="w-10 border rounded px-1 py-1 text-center text-xs border-amber-300 bg-amber-50/50 text-amber-800"
                                                    />
                                                    <span className="text-slate-300">/</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={ci.missing || ''}
                                                        placeholder="0"
                                                        onChange={e => updateItem(sizeInfo.barcode, 'missing', parseInt(e.target.value) || 0)}
                                                        className="w-10 border rounded px-1 py-1 text-center text-xs border-red-300 bg-red-50/50 text-red-800"
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary Cards */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500 mb-1">คงเหลือ</p>
                        <p className="text-xl font-bold text-slate-700">{totalRemaining}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                        <p className="text-xs text-amber-600 mb-1">ชำรุด</p>
                        <p className="text-xl font-bold text-amber-700">{totalDamaged}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-3 text-center">
                        <p className="text-xs text-red-600 mb-1">สูญหาย</p>
                        <p className="text-xl font-bold text-red-700">{totalMissing}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                        <p className="text-xs text-emerald-600 mb-1">ส่งคืน</p>
                        <p className="text-xl font-bold text-emerald-700">{totalReturn}</p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5" />
                    )}
                    ยืนยันปิดยอด (ส่งคืน {totalReturn} ชิ้น)
                </button>
            </div>
        </div>
    );
}
