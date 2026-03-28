'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAllocation } from '@/actions/stock-request';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Download, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/shared';
import * as XLSX from 'xlsx';

interface Props {
    readonly requestId: string;
    readonly channelName: string;
    readonly requestedTotal: number;
    readonly requestedItems?: any[];
}

interface AllocationRow {
    barcode: string;
    code?: string;
    color?: string;
    size: string | null;
    packedQuantity: number;
    price: number;
}

interface ExcelRow {
    no: number;
    type: string;
    code: string;
    color: string;
    sizes: { size: string; qty: number }[];
    total: number;
    price: number;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

export default function AllocationUpload({ requestId, channelName, requestedTotal, requestedItems }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
    const [rows, setRows] = useState<AllocationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const totalQty = rows.reduce((sum, r) => sum + r.packedQuantity, 0);

    // ========== Auto-Mapping from Requested Items ==========
    useEffect(() => {
        if (requestedItems && requestedItems.length > 0) {
            const parsedAllocRows: AllocationRow[] = [];
            const grouped = new Map<string, ExcelRow>();

            requestedItems.forEach(item => {
                const p = item.product;
                if (!p) return;

                // Push to alloc rows
                parsedAllocRows.push({
                    barcode: item.barcode,
                    code: p.code,
                    color: p.color,
                    size: p.size,
                    packedQuantity: item.quantity,
                    price: p.price || 0,
                });

                // Group for excelRows
                const key = `${p.code}-${p.color}`;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        no: grouped.size + 1,
                        type: p.producttype || '',
                        code: p.code,
                        color: p.color,
                        sizes: [],
                        total: 0,
                        price: p.price || 0,
                    });
                }
                const group = grouped.get(key)!;
                if (p.size) {
                    const existingSize = group.sizes.find(s => s.size === p.size);
                    if (existingSize) {
                        existingSize.qty += item.quantity;
                    } else {
                        group.sizes.push({ size: p.size, qty: item.quantity });
                    }
                }
                group.total += item.quantity;
            });

            setExcelRows(Array.from(grouped.values()));
            setRows(parsedAllocRows);
            setFileName('ดึงข้อมูลจากรายการที่ PC ขอมาอัตโนมัติ');
        }
    }, [requestedItems]);

    // ========== Download Template with Product Master ==========
    const downloadTemplate = async () => {
        setLoading(true);
        try {
            const { getProductMasterForTemplate } = await import('@/actions/stock-request');
            const products = await getProductMasterForTemplate();

            const headers = ['ลำดับ', 'ประเภท', 'รุ่น', 'สี', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'รวม', 'ราคา'];
            const dataRows = products.map((p, i) => [
                i + 1,
                p.producttype,
                p.code,
                p.color,
                '', '', '', '', '', '',  // S, M, L, XL, 2XL, 3XL — user fills these
                '',                      // รวม
                p.price || '',           // ราคา
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
        } finally {
            setLoading(false);
        }
    };

    // ========== Export Pre-filled Items ==========
    const downloadRequestedItems = () => {
        try {
            if (excelRows.length === 0) return;

            const headers = ['ลำดับ', 'ประเภท', 'รุ่น', 'สี', ...SIZES, 'รวม', 'ราคา'];
            const dataRows = excelRows.map((r, i) => {
                const sizeMap = Object.fromEntries(r.sizes.map(s => [s.size, s.qty]));
                return [
                    i + 1,
                    r.type,
                    r.code,
                    r.color,
                    ...SIZES.map(s => sizeMap[s] || ''),
                    r.total,
                    r.price || ''
                ];
            });

            const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
            ws['!cols'] = [
                { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                ...SIZES.map(() => ({ wch: 6 })),
                { wch: 8 }, { wch: 10 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'รายการขอเบิก');
            XLSX.writeFile(wb, `รายการแก้ไขจัดสรร.xlsx`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'นำออกไฟล์ไม่สำเร็จ');
        }
    };

    // ========== Import Excel ==========
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setError(null);
        setFileName(file.name);

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown as unknown[][];

            if (rawData.length < 2) {
                throw new Error('ไฟล์ Excel ต้องมีอย่างน้อย 1 แถวข้อมูล (ไม่รวมหัวตาราง)');
            }

            const parsedExcelRows: ExcelRow[] = [];
            const parsedAllocRows: AllocationRow[] = [];

            // Auto-detect columns from header row
            const headers = (rawData[0] || []).map(h => String(h || '').trim());
            const SIZE_MAP_LOCAL: Record<string, string> = { 'XXL': '2XL' };
            const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL'];

            const sizeColumns: { colIdx: number; size: string }[] = [];
            let totalColIdx = -1;
            let priceColIdx = -1;

            headers.forEach((h, idx) => {
                const upper = h.toUpperCase();
                if (ALL_SIZES.includes(upper)) {
                    const normalizedSize = SIZE_MAP_LOCAL[upper] || upper;
                    sizeColumns.push({ colIdx: idx, size: normalizedSize });
                } else if (h === 'รวม') {
                    totalColIdx = idx;
                } else if (h === 'ราคา') {
                    priceColIdx = idx;
                }
            });

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
                    }
                });

                const explicitTotal = totalColIdx >= 0 ? (Number(row[totalColIdx]) || 0) : 0;
                const sizeSum = sizeQties.reduce((s, q) => s + q.qty, 0);
                const total = explicitTotal > 0 ? explicitTotal : sizeSum;

                parsedExcelRows.push({ no, type, code, color, sizes: sizeQties, total, price });

                if (sizeQties.length > 0) {
                    // Product WITH sizes — create one row per size
                    for (const sq of sizeQties) {
                        parsedAllocRows.push({
                            barcode: `${code}-${color}-${sq.size}`,
                            code,
                            color,
                            size: sq.size,
                            packedQuantity: sq.qty,
                            price,
                        });
                    }
                } else if (total > 0) {
                    // Product WITHOUT sizes (e.g. shirts) — single row using "รวม" column
                    parsedAllocRows.push({
                        barcode: `${code}-${color}`,
                        code,
                        color,
                        size: null,
                        packedQuantity: total,
                        price,
                    });
                }
            }

            if (parsedExcelRows.length === 0) {
                throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
            }

            setExcelRows(parsedExcelRows);
            setRows(parsedAllocRows);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const clearImport = () => {
        setExcelRows([]);
        setRows([]);
        setFileName(null);
        setError(null);
        setProgress(0);
    };

    const handleSubmit = async (adminOverride: boolean = false) => {
        if (rows.length === 0) return;
        setLoading(true);
        setError(null);
        setProgress(0);

        try {
            // Upload in batches with progress
            const BATCH_SIZE = 50;
            const batches: AllocationRow[][] = [];

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                batches.push(rows.slice(i, i + BATCH_SIZE));
            }

            if (batches.length <= 1) {
                // Single batch — just upload all at once
                setProgress(50);
                const result = await uploadAllocation(requestId, rows, adminOverride);
                if (result && 'error' in result && result.error) {
                    // Show error with option to force
                    if (result.missingCodes && result.missingCodes.length > 0) {
                        const shouldForce = confirm(
                            `${result.error}\n\nต้องการข้ามสินค้าที่ไม่พบแล้วจัดสรรเฉพาะสินค้าที่มีในระบบหรือไม่?`
                        );
                        if (shouldForce) {
                            setLoading(false);
                            return handleSubmit(true);
                        }
                    }
                    setError(result.error);
                    setProgress(0);
                    setLoading(false);
                    return;
                }
                setProgress(100);
            } else {
                // Multiple batches — upload first batch to create, rest to append
                for (let i = 0; i < batches.length; i++) {
                    const result = await uploadAllocation(requestId, batches[i], adminOverride);
                    if (result && 'error' in result && result.error) {
                        setError(result.error);
                        setProgress(0);
                        setLoading(false);
                        return;
                    }
                    setProgress(Math.round(((i + 1) / batches.length) * 100));
                }
            }

            // Small delay to show 100%
            await new Promise(r => setTimeout(r, 500));
            router.refresh();
            router.push('/warehouse/packing');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-sm text-indigo-800">
                    <strong>{channelName}</strong> — ขอ <strong>{requestedTotal.toLocaleString()}</strong> ชิ้น
                </p>
            </div>

            {/* Template Download & File Upload */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">นำเข้าข้อมูลจาก Excel</h3>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                    >
                        <Download className="h-4 w-4" /> โหลดรายการเปล่าทั้งหมด
                    </button>

                    {(requestedItems && requestedItems.length > 0) && (
                        <button
                            onClick={downloadRequestedItems}
                            className="flex items-center gap-2 px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 text-sm font-medium transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4" /> Export ออกไปแก้ไข
                        </button>
                    )}

                    <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium cursor-pointer transition-colors">
                        <Upload className="h-4 w-4" /> {importing ? 'กำลังอ่าน...' : 'Import Excel'}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={importing}
                        />
                    </label>

                    {fileName && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                            {fileName}
                            <button onClick={clearImport} className="text-slate-400 hover:text-red-500 ml-1">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-xs text-slate-400">
                    Format: ลำดับ, ประเภท, รุ่น, สี, XS, S, M, L, XL, 2XL, 3XL, 4XL, รวม, ราคา
                    <br />
                    <span className="text-slate-500">สินค้าที่ไม่มี size ให้ใส่จำนวนใน "รวม" ไม่ต้องกรอกช่อง size</span>
                </p>
            </div>

            {/* Preview Table */}
            {excelRows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700">
                            <FileSpreadsheet className="h-4 w-4 inline text-emerald-600 mr-1" />
                            ข้อมูลที่นำเข้า ({excelRows.length} รายการ)
                        </h3>
                        <button onClick={clearImport} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                            <Trash2 className="h-3.5 w-3.5" /> ล้างข้อมูล
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-center p-2 text-xs font-medium text-slate-500 w-10">#</th>
                                    <th className="text-left p-2 text-xs font-medium text-slate-500">ประเภท</th>
                                    <th className="text-left p-2 text-xs font-medium text-slate-500">รุ่น</th>
                                    <th className="text-left p-2 text-xs font-medium text-slate-500">สี</th>
                                    {SIZES.map(s => (
                                        <th key={s} className="text-center p-2 text-xs font-medium text-slate-500 w-12">{s}</th>
                                    ))}
                                    <th className="text-center p-2 text-xs font-medium text-slate-500 w-14">รวม</th>
                                    <th className="text-right p-2 text-xs font-medium text-slate-500 w-16">ราคา</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {excelRows.map((r, i) => {
                                    const sizeMap = Object.fromEntries(r.sizes.map(s => [s.size, s.qty]));
                                    const hasSizes = r.sizes.length > 0;
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2 text-center text-slate-400">{r.no}</td>
                                            <td className="p-2">{r.type}</td>
                                            <td className="p-2 font-medium text-indigo-700">{r.code}</td>
                                            <td className="p-2">{r.color}</td>
                                            {SIZES.map(s => (
                                                <td key={s} className="p-2 text-center">
                                                    {hasSizes
                                                        ? (sizeMap[s] ? <span className="font-medium">{sizeMap[s]}</span> : <span className="text-slate-300">-</span>)
                                                        : <span className="text-slate-200">·</span>
                                                    }
                                                </td>
                                            ))}
                                            <td className="p-2 text-center font-bold text-slate-900">{r.total}</td>
                                            <td className="p-2 text-right">฿{r.price.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colSpan={4} className="p-2 text-sm font-semibold text-slate-700">รวมทั้งหมด</td>
                                    {SIZES.map(s => {
                                        const sizeTotal = excelRows.reduce((sum, r) => {
                                            const found = r.sizes.find(sz => sz.size === s);
                                            return sum + (found ? found.qty : 0);
                                        }, 0);
                                        return (
                                            <td key={s} className="p-2 text-center font-bold text-slate-700">
                                                {sizeTotal > 0 ? sizeTotal : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 text-center font-bold text-indigo-700 text-base">{totalQty}</td>
                                    <td className="p-2" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Validation */}
            {totalQty > 0 && totalQty !== requestedTotal && (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    จำนวนจัดสรร ({totalQty.toLocaleString()}) ไม่ตรงกับที่ขอ ({requestedTotal.toLocaleString()})
                </div>
            )}

            {totalQty > 0 && totalQty === requestedTotal && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    จำนวนจัดสรรตรงกับที่ขอ ({requestedTotal.toLocaleString()} ชิ้น) ✓
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
            )}

            {/* Progress Bar */}
            {loading && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 flex items-center gap-2">
                            <Spinner size="sm" className="text-indigo-600" />
                            กำลังอัปโหลด...
                        </span>
                        <span className="font-bold text-indigo-700">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[11px] text-slate-400">
                        กำลังบันทึก {rows.length} รายการ ({totalQty.toLocaleString()} ชิ้น)
                    </p>
                </div>
            )}

            {/* Submit */}
            <button
                onClick={() => handleSubmit()}
                disabled={loading || rows.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                <CheckCircle2 className="h-4 w-4" /> {loading ? 'กำลังบันทึก...' : `ยืนยันจัดสรร (${totalQty.toLocaleString()} ชิ้น)`}
            </button>
        </div>
    );
}
