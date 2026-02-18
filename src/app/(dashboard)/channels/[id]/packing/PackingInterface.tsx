'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPacking, uploadAllocation, updateSingleAllocation } from '@/actions/stock-request-actions';
import { CheckCircle2, Pencil, Upload, Save, X, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Allocation {
    id: string;
    barcode: string;
    size: string | null;
    packedQuantity: number;
    price: number;
    product: { name: string; code: string | null; color: string | null };
}

interface Props {
    readonly requestId: string;
    readonly requestedTotal: number;
    readonly allocations: Allocation[];
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

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

export default function PackingInterface({ requestId, requestedTotal, allocations }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQty, setEditQty] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [showConfirmPack, setShowConfirmPack] = useState(false);
    const [showConfirmImport, setShowConfirmImport] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const totalPacked = allocations.reduce((sum, a) => sum + a.packedQuantity, 0);

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

    // ========== Inline Edit ==========
    const startEdit = (a: Allocation) => {
        setEditingId(a.id);
        setEditQty(a.packedQuantity);
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            await updateSingleAllocation(id, editQty);
            setEditingId(null);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
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
                if (!code) continue;

                SIZES.forEach((size, idx) => {
                    const qty = Number(row[4 + idx]) || 0;
                    if (qty > 0) {
                        rows.push({
                            barcode: `${code}-${size}`,
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
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-left p-3 text-xs font-medium text-slate-500">สินค้า</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500">สี</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500">ไซส์</th>
                            <th className="text-right p-3 text-xs font-medium text-slate-500">จำนวน</th>
                            <th className="text-right p-3 text-xs font-medium text-slate-500">ราคา</th>
                            <th className="text-center p-3 text-xs font-medium text-slate-500 w-20">แก้ไข</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allocations.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50">
                                <td className="p-3">
                                    <p className="font-medium text-slate-900">{a.product.name}</p>
                                    <p className="text-xs text-slate-400">{a.product.code || a.barcode}</p>
                                </td>
                                <td className="p-3 text-center">{a.product.color || '-'}</td>
                                <td className="p-3 text-center">{a.size || '-'}</td>
                                <td className="p-3 text-right font-medium">
                                    {editingId === a.id ? (
                                        <input
                                            type="number"
                                            min={0}
                                            value={editQty}
                                            onChange={e => setEditQty(Number(e.target.value) || 0)}
                                            className="w-20 text-right border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') saveEdit(a.id);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                    ) : (
                                        a.packedQuantity
                                    )}
                                </td>
                                <td className="p-3 text-right">฿{Number(a.price).toLocaleString()}</td>
                                <td className="p-3 text-center">
                                    {editingId === a.id ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => saveEdit(a.id)}
                                                disabled={loading}
                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                title="บันทึก"
                                            >
                                                <Save className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                                title="ยกเลิก"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEdit(a)}
                                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            title="แก้ไขจำนวน"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
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
