'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPacking, uploadAllocation } from '@/actions/stock-request-actions';
import { CheckCircle2, Upload, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Allocation {
    id: string;
    barcode: string;
    size: string | null;
    packedQuantity: number;
    price: number;
    product: { name: string; code: string | null; color: string | null; producttype: string | null };
}

interface Props {
    readonly requestId: string;
    readonly requestedTotal: number;
    readonly status: string;
    readonly allocations: Allocation[];
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

interface GroupedRow {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, number>;
    total: number;
    price: number;
}

// ========== Confirm Modal ==========
function ConfirmModal({
    open,
    title,
    message,
    confirmLabel,
    confirmColor = 'bg-emerald-600 hover:bg-emerald-700',
    loading,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: string;
    loading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">{message}</p>
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${confirmColor}`}
                    >
                        {loading ? 'กำลังดำเนินการ...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PackingInterface({ requestId, requestedTotal, status, allocations }: Props) {
    const isPacked = status === 'packed';
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showConfirmPack, setShowConfirmPack] = useState(false);
    const [showConfirmImport, setShowConfirmImport] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const totalPacked = allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

    // Group allocations by code + color for Excel-like display
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
                    price: a.price,
                };
                map.set(key, row);
            }
            if (a.size) {
                row.sizes[a.size] = (row.sizes[a.size] || 0) + a.packedQuantity;
            }
            row.total += a.packedQuantity;
        }

        return Array.from(map.values());
    }, [allocations]);

    // Size totals for footer
    const sizeTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of SIZES) {
            totals[s] = groupedRows.reduce((sum, r) => sum + (r.sizes[s] || 0), 0);
        }
        return totals;
    }, [groupedRows]);

    // ========== Confirm Packing ==========
    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            await confirmPacking(requestId);
            setShowConfirmPack(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
            setShowConfirmPack(false);
        } finally {
            setLoading(false);
        }
    };

    // ========== Re-import Excel ==========
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setShowConfirmImport(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImportConfirm = async () => {
        if (!pendingFile) return;
        setImporting(true);
        setError(null);
        setShowConfirmImport(false);

        try {
            const data = await pendingFile.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];

            if (rawData.length < 2) {
                throw new Error('ไฟล์ Excel ต้องมีอย่างน้อย 1 แถวข้อมูล');
            }

            const rows: { barcode: string; size: string | null; packedQuantity: number; price: number }[] = [];

            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length < 4) continue;

                const code = String(row[2] || '').trim();
                const color = String(row[3] || '').trim();
                if (!code) continue;

                SIZES.forEach((size, idx) => {
                    const qty = Number(row[4 + idx]) || 0;
                    if (qty > 0) {
                        rows.push({
                            barcode: `${code}-${color}-${size}`,
                            size,
                            packedQuantity: qty,
                            price: Number(row[11]) || 0,
                        });
                    }
                });
            }

            if (rows.length === 0) {
                throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
            }

            await uploadAllocation(requestId, rows);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setImporting(false);
            setPendingFile(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <p className="text-sm text-slate-500">รายการที่จัดสรร</p>
                    <p className="text-lg font-bold text-slate-900">{totalPacked} / {requestedTotal} ชิ้น</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isPacked ? (
                        <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" /> แพ็คเรียบร้อยแล้ว
                        </span>
                    ) : (
                        <>
                            {/* Re-import Excel */}
                            <label className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 text-sm font-medium cursor-pointer transition-colors">
                                <Upload className="h-4 w-4" /> {importing ? 'กำลังนำเข้า...' : 'Import ใหม่'}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={importing}
                                />
                            </label>

                            {/* Confirm Packing */}
                            <button
                                onClick={() => setShowConfirmPack(true)}
                                disabled={loading || allocations.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                            >
                                <CheckCircle2 className="h-4 w-4" /> ยืนยันแพ็ค
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            {/* Grouped Table — Excel-like format */}
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
                            <th className="text-right p-3 text-xs font-semibold text-slate-600 w-20">ราคา</th>
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
                                            <span className="font-medium text-slate-900">{row.sizes[s]}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                ))}
                                <td className="p-3 text-center font-bold text-slate-900">{row.total}</td>
                                <td className="p-3 text-right text-slate-700">฿{row.price.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                        <tr>
                            <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                            {SIZES.map(s => (
                                <td key={s} className="p-3 text-center font-bold text-slate-700">
                                    {sizeTotals[s] > 0 ? sizeTotals[s] : '-'}
                                </td>
                            ))}
                            <td className="p-3 text-center font-bold text-indigo-700 text-base">{totalPacked}</td>
                            <td className="p-3" />
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Confirm Packing Modal */}
            <ConfirmModal
                open={showConfirmPack}
                title="ยืนยันแพ็คสินค้า"
                message={`ยืนยันแพ็คสินค้าทั้งหมด ${totalPacked.toLocaleString()} ชิ้น? หลังจากยืนยันแล้วจะไม่สามารถแก้ไขการจัดสรรได้`}
                confirmLabel="ยืนยันแพ็ค"
                loading={loading}
                onConfirm={handleConfirm}
                onCancel={() => setShowConfirmPack(false)}
            />

            {/* Confirm Re-import Modal */}
            <ConfirmModal
                open={showConfirmImport}
                title="Import ข้อมูลใหม่"
                message={`การ Import ใหม่จะแทนที่ข้อมูลจัดสรรทั้งหมดที่มีอยู่ (${allocations.length} รายการ) ต้องการดำเนินการต่อหรือไม่?`}
                confirmLabel="Import ทับ"
                confirmColor="bg-indigo-600 hover:bg-indigo-700"
                loading={importing}
                onConfirm={handleImportConfirm}
                onCancel={() => { setShowConfirmImport(false); setPendingFile(null); }}
            />
        </div>
    );
}
