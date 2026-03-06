'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPacking, uploadAllocation } from '@/actions/stock-request';
import { CheckCircle2, Upload, AlertTriangle, X, Download } from 'lucide-react';
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

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

interface GroupedRow {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, number>;
    total: number;
    price: number;
}

interface PreviewRow {
    no: number;
    type: string;
    code: string;
    color: string;
    sizes: { size: string; qty: number }[];
    total: number;
    price: number;
}

// ========== Confirm Modal ==========
function ConfirmModal({
    open, title, message, confirmLabel,
    confirmColor = 'bg-emerald-600 hover:bg-emerald-700',
    loading, onConfirm, onCancel,
}: {
    open: boolean; title: string; message: string; confirmLabel: string;
    confirmColor?: string; loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">{message}</p>
                <div className="flex items-center justify-end gap-3">
                    <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button>
                    <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${confirmColor}`}>
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
    const [showConfirmPack, setShowConfirmPack] = useState(false);

    // Preview states
    const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
    const [pendingImportRows, setPendingImportRows] = useState<{ barcode: string; code?: string; color?: string; size: string | null; packedQuantity: number; price: number }[]>([]);
    const showPreview = previewRows.length > 0;

    const totalPacked = allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

    // Group allocations by code + color
    const groupedRows: GroupedRow[] = useMemo(() => {
        const map = new Map<string, GroupedRow>();
        let counter = 0;
        for (const a of allocations) {
            const key = `${a.product.code || a.barcode}__${a.product.color || ''}`;
            let row = map.get(key);
            if (!row) {
                counter++;
                row = { no: counter, producttype: a.product.producttype || a.product.name || '', code: a.product.code || a.barcode, color: a.product.color || '-', sizes: {}, total: 0, price: a.price };
                map.set(key, row);
            }
            if (a.size) row.sizes[a.size] = (row.sizes[a.size] || 0) + a.packedQuantity;
            row.total += a.packedQuantity;
        }
        return Array.from(map.values());
    }, [allocations]);

    const sizeTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of SIZES) totals[s] = groupedRows.reduce((sum, r) => sum + (r.sizes[s] || 0), 0);
        return totals;
    }, [groupedRows]);

    // ========== Confirm Packing ==========
    const handleConfirm = async () => {
        setLoading(true); setError(null);
        try {
            await confirmPacking(requestId);
            setShowConfirmPack(false);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
            setShowConfirmPack(false);
        } finally { setLoading(false); }
    };

    // ========== Download Template with Product Master ==========
    const downloadTemplate = async () => {
        setLoading(true); setError(null);
        try {
            const { getProductMasterForTemplate } = await import('@/actions/stock-request');
            const products = await getProductMasterForTemplate();

            const headers = ['ลำดับ', 'ประเภท', 'รุ่น', 'สี', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'รวม', 'ราคา'];
            const dataRows = products.map((p, i) => [
                i + 1,
                p.producttype,
                p.code,
                p.color,
                '', '', '', '', '', '',
                '',
                p.price || '',
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
            ws['!cols'] = [
                { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
                { wch: 8 }, { wch: 10 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'จัดสรรสินค้า');
            XLSX.writeFile(wb, `template_จัดสรรสินค้า.xlsx`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'ไม่สามารถดาวน์โหลด Template ได้');
        } finally { setLoading(false); }
    };

    // ========== Import Excel → Parse & Preview ==========
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (fileInputRef.current) fileInputRef.current.value = '';
        setError(null);

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown as unknown[][];

            if (rawData.length < 2) throw new Error('ไฟล์ Excel ต้องมีอย่างน้อย 1 แถวข้อมูล');

            // Auto-detect columns from header row
            const headers = (rawData[0] || []).map(h => String(h || '').trim());
            const SIZE_MAP: Record<string, string> = { 'XXL': '2XL' };
            const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

            // Find size columns, รวม, ราคา by header name
            const sizeColumns: { colIdx: number; size: string }[] = [];
            let totalColIdx = -1;
            let priceColIdx = -1;

            headers.forEach((h, idx) => {
                const upper = h.toUpperCase();
                if (ALL_SIZES.includes(upper)) {
                    const normalizedSize = SIZE_MAP[upper] || upper;
                    sizeColumns.push({ colIdx: idx, size: normalizedSize });
                } else if (h === 'รวม') {
                    totalColIdx = idx;
                } else if (h === 'ราคา') {
                    priceColIdx = idx;
                }
            });

            const rows: typeof pendingImportRows = [];
            const preview: PreviewRow[] = [];

            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length < 4) continue;
                const no = Number(row[0]) || i;
                const type = String(row[1] || '').trim();
                const code = String(row[2] || '').trim();
                const color = String(row[3] || '').trim();
                if (!code) continue;

                const sizeQties: { size: string; qty: number }[] = [];
                const price = priceColIdx >= 0 ? (Number(row[priceColIdx]) || 0) : 0;

                sizeColumns.forEach(({ colIdx, size }) => {
                    const qty = Number(row[colIdx]) || 0;
                    if (qty > 0) {
                        sizeQties.push({ size, qty });
                        rows.push({ barcode: color ? `${code}-${color}-${size}` : `${code}-${size}`, code, color: color || undefined, size, packedQuantity: qty, price });
                    }
                });

                const explicitTotal = totalColIdx >= 0 ? (Number(row[totalColIdx]) || 0) : 0;
                const sizeSum = sizeQties.reduce((s, q) => s + q.qty, 0);
                const total = explicitTotal > 0 ? explicitTotal : sizeSum;

                if (sizeQties.length === 0 && total > 0) {
                    rows.push({ barcode: color ? `${code}-${color}` : code, code, color: color || undefined, size: null, packedQuantity: total, price });
                }
                if (total > 0 || sizeQties.length > 0) {
                    preview.push({ no, type, code, color, sizes: sizeQties, total, price });
                }
            }

            if (rows.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
            setPreviewRows(preview);
            setPendingImportRows(rows);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        }
    };

    // ========== Confirm Import after Preview ==========
    const handleImportConfirm = async () => {
        if (pendingImportRows.length === 0) return;
        setImporting(true); setError(null);
        try {
            const result = await uploadAllocation(requestId, pendingImportRows);
            if (result && 'error' in result && result.error) {
                setError(result.error);
            } else {
                setPreviewRows([]); setPendingImportRows([]);
                router.refresh();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally { setImporting(false); }
    };

    const cancelPreview = () => { setPreviewRows([]); setPendingImportRows([]); setError(null); };
    const previewTotal = previewRows.reduce((s, r) => s + r.total, 0);

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
                            {/* Download Template */}
                            <button onClick={downloadTemplate} disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50">
                                <Download className="h-4 w-4" /> {loading ? 'กำลังโหลด...' : 'ดาวน์โหลด Template'}
                            </button>
                            <label className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 text-sm font-medium cursor-pointer transition-colors">
                                <Upload className="h-4 w-4" /> {importing ? 'กำลังนำเข้า...' : 'Import ใหม่'}
                                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" disabled={importing} />
                            </label>
                            <button onClick={() => setShowConfirmPack(true)} disabled={loading || allocations.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">
                                <CheckCircle2 className="h-4 w-4" /> ยืนยันแพ็ค
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>}

            {/* ========== Import Preview ========== */}
            {showPreview && (
                <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-indigo-900">📋 ตรวจสอบข้อมูลก่อนบันทึก ({previewRows.length} รายการ · {previewTotal} ชิ้น)</h3>
                        <button onClick={cancelPreview} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="overflow-x-auto bg-white border border-indigo-100 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-50">
                                <tr>
                                    <th className="text-center p-2 text-xs font-semibold text-indigo-600 w-10">#</th>
                                    <th className="text-left p-2 text-xs font-semibold text-indigo-600">ประเภท</th>
                                    <th className="text-left p-2 text-xs font-semibold text-indigo-600">รุ่น</th>
                                    <th className="text-center p-2 text-xs font-semibold text-indigo-600">สี</th>
                                    {SIZES.map(s => <th key={s} className="text-center p-2 text-xs font-semibold text-indigo-600 w-12">{s}</th>)}
                                    <th className="text-center p-2 text-xs font-semibold text-indigo-600 w-14">รวม</th>
                                    <th className="text-right p-2 text-xs font-semibold text-indigo-600 w-16">ราคา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-50">
                                {previewRows.map(row => {
                                    const sizeMap = Object.fromEntries(row.sizes.map(s => [s.size, s.qty]));
                                    return (
                                        <tr key={`${row.code}-${row.color}-${row.no}`} className="hover:bg-indigo-50/50">
                                            <td className="p-2 text-center text-slate-400">{row.no}</td>
                                            <td className="p-2 text-slate-700">{row.type}</td>
                                            <td className="p-2 font-semibold text-indigo-700">{row.code}</td>
                                            <td className="p-2 text-center text-slate-700">{row.color || '-'}</td>
                                            {SIZES.map(s => <td key={s} className="p-2 text-center">{sizeMap[s] ? <span className="font-medium">{sizeMap[s]}</span> : <span className="text-slate-300">-</span>}</td>)}
                                            <td className="p-2 text-center font-bold">{row.total}</td>
                                            <td className="p-2 text-right text-slate-700">฿{row.price.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <button onClick={cancelPreview} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white">ยกเลิก</button>
                        <button onClick={handleImportConfirm} disabled={importing} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            {importing ? 'กำลังบันทึก...' : `บันทึก (${previewTotal} ชิ้น)`}
                        </button>
                    </div>
                </div>
            )}

            {/* Grouped Table */}
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="text-center p-3 text-xs font-semibold text-slate-600 w-10">#</th>
                            <th className="text-left p-3 text-xs font-semibold text-slate-600">ประเภท</th>
                            <th className="text-left p-3 text-xs font-semibold text-slate-600">รุ่น</th>
                            <th className="text-center p-3 text-xs font-semibold text-slate-600">สี</th>
                            {SIZES.map(s => <th key={s} className="text-center p-3 text-xs font-semibold text-slate-600 w-14">{s}</th>)}
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
                                        {row.sizes[s] ? <span className="font-medium text-slate-900">{row.sizes[s]}</span> : <span className="text-slate-300">-</span>}
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
                            {SIZES.map(s => <td key={s} className="p-3 text-center font-bold text-slate-700">{sizeTotals[s] > 0 ? sizeTotals[s] : '-'}</td>)}
                            <td className="p-3 text-center font-bold text-indigo-700 text-base">{totalPacked}</td>
                            <td className="p-3" />
                        </tr>
                    </tfoot>
                </table>
            </div>

            <ConfirmModal open={showConfirmPack} title="ยืนยันแพ็คสินค้า"
                message={`ยืนยันแพ็คสินค้าทั้งหมด ${totalPacked.toLocaleString()} ชิ้น? หลังจากยืนยันแล้วจะไม่สามารถแก้ไขการจัดสรรได้`}
                confirmLabel="ยืนยันแพ็ค" loading={loading} onConfirm={handleConfirm} onCancel={() => setShowConfirmPack(false)} />
        </div>
    );
}
