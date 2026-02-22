'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAllocation } from '@/actions/stock-request-actions';
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
    readonly requestId: string;
    readonly channelName: string;
    readonly requestedTotal: number;
}

interface AllocationRow {
    barcode: string;
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

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

export default function AllocationUpload({ requestId, channelName, requestedTotal }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
    const [rows, setRows] = useState<AllocationRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const totalQty = rows.reduce((sum, r) => sum + r.packedQuantity, 0);

    // ========== Download Template ==========
    const downloadTemplate = () => {
        const headers = ['ลำดับ', 'ประเภท', 'รุ่น', 'สี', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'รวม', 'ราคา'];
        const exampleRow = [1, 'กางเกง', 'SR4006', 'อ่อน', 1, 2, 3, 4, 5, 6, 21, 790];

        const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

        // Set column widths
        ws['!cols'] = [
            { wch: 6 },   // ลำดับ
            { wch: 12 },  // ประเภท
            { wch: 12 },  // รุ่น
            { wch: 10 },  // สี
            { wch: 6 },   // S
            { wch: 6 },   // M
            { wch: 6 },   // L
            { wch: 6 },   // XL
            { wch: 6 },   // XXL
            { wch: 6 },   // 3XL
            { wch: 8 },   // รวม
            { wch: 10 },  // ราคา
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'จัดสรรสินค้า');
        XLSX.writeFile(wb, `allocation_template.xlsx`);
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
            const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];

            if (rawData.length < 2) {
                throw new Error('ไฟล์ Excel ต้องมีอย่างน้อย 1 แถวข้อมูล (ไม่รวมหัวตาราง)');
            }

            // Skip header row, parse data rows
            const parsedExcelRows: ExcelRow[] = [];
            const parsedAllocRows: AllocationRow[] = [];

            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length < 4) continue;

                const no = Number(row[0]) || i;
                const type = String(row[1] || '').trim();
                const code = String(row[2] || '').trim();
                const color = String(row[3] || '').trim();

                if (!code) continue; // Skip empty rows

                const sizeQties: { size: string; qty: number }[] = [];

                // Columns 4-9 are S, M, L, XL, XXL, 3XL
                SIZES.forEach((size, idx) => {
                    const qty = Number(row[4 + idx]) || 0;
                    if (qty > 0) {
                        sizeQties.push({ size, qty });
                    }
                });

                const total = Number(row[10]) || sizeQties.reduce((s, q) => s + q.qty, 0);
                const price = Number(row[11]) || 0;

                parsedExcelRows.push({ no, type, code, color, sizes: sizeQties, total, price });

                // Convert to allocation rows — generate barcode from code+color+size
                for (const sq of sizeQties) {
                    parsedAllocRows.push({
                        barcode: `${code}-${color}-${sq.size}`,
                        size: sq.size,
                        packedQuantity: sq.qty,
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
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const clearImport = () => {
        setExcelRows([]);
        setRows([]);
        setFileName(null);
        setError(null);
    };

    const handleSubmit = async () => {
        if (rows.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            await uploadAllocation(requestId, rows);
            router.refresh();
            router.push('/warehouse/packing');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
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
                    {/* Download Template Button */}
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 text-sm font-medium transition-colors"
                    >
                        <Download className="h-4 w-4" /> ดาวน์โหลด Template
                    </button>

                    {/* Upload Button */}
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
                    Format: ลำดับ, ประเภท, รุ่น, สี, S, M, L, XL, XXL, 3XL, รวม, ราคา
                </p>
            </div>

            {/* Preview Table — show imported data in the original Excel format */}
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
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2 text-center text-slate-400">{r.no}</td>
                                            <td className="p-2">{r.type}</td>
                                            <td className="p-2 font-medium text-indigo-700">{r.code}</td>
                                            <td className="p-2">{r.color}</td>
                                            {SIZES.map(s => (
                                                <td key={s} className="p-2 text-center">
                                                    {sizeMap[s] ? <span className="font-medium">{sizeMap[s]}</span> : <span className="text-slate-300">-</span>}
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

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading || rows.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
                <CheckCircle2 className="h-4 w-4" /> {loading ? 'กำลังบันทึก...' : `ยืนยันจัดสรร (${totalQty.toLocaleString()} ชิ้น)`}
            </button>
        </div>
    );
}
