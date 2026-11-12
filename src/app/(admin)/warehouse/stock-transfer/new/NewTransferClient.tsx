'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, ArrowRightLeft, ArrowRight, Search, Plus, Minus, Send, Package,
    Download, Upload, AlertTriangle, CheckCircle2, X
} from 'lucide-react';
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
        sku: string | null;
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
    const { toastError, toastSuccess } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importedFileName, setImportedFileName] = useState<string | null>(null);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    // Load stock when source channel changes
    const loadStock = useCallback(async (channelId: string) => {
        if (!channelId) {
            setAvailableStock([]);
            setSelectedItems([]);
            setImportedFileName(null);
            setImportErrors([]);
            setShowSelectedOnly(false);
            return;
        }
        setStockLoading(true);
        try {
            const stock = await getAvailableStock(channelId);
            setAvailableStock(stock);
            setSelectedItems([]);
            setImportedFileName(null);
            setImportErrors([]);
            setShowSelectedOnly(false);
        } catch (err) {
            console.error('Failed to load stock for channel:', channelId, err);
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

    // Filter stock by search and selected-only filter
    const filteredStock = availableStock.filter(s => {
        if (showSelectedOnly && !selectedItems.some(i => i.barcode === s.barcode)) {
            return false;
        }
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            s.barcode.toLowerCase().includes(term) ||
            (s.product.sku && s.product.sku.toLowerCase().includes(term)) ||
            s.product.name.toLowerCase().includes(term) ||
            (s.product.code && s.product.code.toLowerCase().includes(term)) ||
            (s.product.color && s.product.color.toLowerCase().includes(term)) ||
            (s.product.size && s.product.size.toLowerCase().includes(term))
        );
    });

    // ========== Export Excel (Row/Barcode+SKU Format, Pre-filled with full remaining stock) ==========
    const handleExportExcel = async () => {
        if (availableStock.length === 0 || !fromChannel || !toChannel) return;
        setExporting(true);
        try {
            const XLSX = await import('xlsx');

            const sheetData = availableStock.map((s, idx) => ({
                'ลำดับ': idx + 1,
                'บาร์โค้ด': s.barcode,
                'SKU': s.product.sku || '',
                'ประเภท': s.product.producttype || '',
                'ชื่อสินค้า': s.product.name,
                'รุ่น': s.product.code || '',
                'สี': s.product.color || '',
                'ไซส์': s.product.size || '',
                'คงเหลือต้นทาง': s.remaining,
                'จำนวนที่โอน': s.remaining,
            }));

            const ws = XLSX.utils.json_to_sheet(sheetData);
            ws['!cols'] = [
                { wch: 7 },   // ลำดับ
                { wch: 18 },  // บาร์โค้ด
                { wch: 18 },  // SKU
                { wch: 14 },  // ประเภท
                { wch: 28 },  // ชื่อสินค้า
                { wch: 14 },  // รุ่น
                { wch: 12 },  // สี
                { wch: 8 },   // ไซส์
                { wch: 14 },  // คงเหลือต้นทาง
                { wch: 14 },  // จำนวนที่โอน
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'รายการโอนย้ายสต็อก');

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const fileName = `transfer_${fromChannel.code}_to_${toChannel.code}_${dateStr}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toastSuccess(`Export สำเร็จ ${availableStock.length} รายการ`);
        } catch (err) {
            console.error('Export Excel error:', err);
            toastError('เกิดข้อผิดพลาดในการ Export Excel');
        } finally {
            setExporting(false);
        }
    };

    // ========== Import Excel with Strict Validation ==========
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportErrors([]);

        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const sheetName = wb.SheetNames[0];
            if (!sheetName) {
                setImportErrors(['ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel']);
                return;
            }

            const ws = wb.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

            if (rawRows.length < 2) {
                setImportErrors(['ไฟล์ Excel ต้องมีหัวตารางและข้อมูลอย่างน้อย 1 แถว']);
                return;
            }

            // Find header row containing ('บาร์โค้ด' or 'SKU') and 'จำนวนที่โอน'
            let headerRowIdx = -1;
            let barcodeColIdx = -1;
            let skuColIdx = -1;
            let transferQtyColIdx = -1;

            for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
                const rowCells = (rawRows[r] || []).map(cell => String(cell ?? '').trim());
                const bIdx = rowCells.findIndex(c => c === 'บาร์โค้ด' || c.toLowerCase() === 'barcode');
                const sIdx = rowCells.findIndex(c => c.toUpperCase() === 'SKU');
                const qIdx = rowCells.findIndex(c => c === 'จำนวนที่โอน' || c.toLowerCase() === 'transfer_qty' || c.toLowerCase() === 'quantity');
                if ((bIdx !== -1 || sIdx !== -1) && qIdx !== -1) {
                    headerRowIdx = r;
                    barcodeColIdx = bIdx;
                    skuColIdx = sIdx;
                    transferQtyColIdx = qIdx;
                    break;
                }
            }

            if (headerRowIdx === -1 || (barcodeColIdx === -1 && skuColIdx === -1) || transferQtyColIdx === -1) {
                setImportErrors([
                    'รูปแบบหัวตารางไม่ถูกต้อง: ต้องมีคอลัมน์ "บาร์โค้ด" (หรือ "SKU") และ "จำนวนที่โอน" (แนะนำให้ใช้ไฟล์ที่กด Export จากหน้านี้)',
                ]);
                return;
            }

            // Build lookup maps of available stock by barcode and SKU
            const stockMap = new Map<string, StockItem>();
            const skuMap = new Map<string, StockItem>();
            for (const item of availableStock) {
                stockMap.set(item.barcode, item);
                stockMap.set(item.barcode.trim().toUpperCase(), item);
                if (item.product.sku) {
                    skuMap.set(item.product.sku, item);
                    skuMap.set(item.product.sku.trim().toUpperCase(), item);
                }
            }

            const errors: string[] = [];
            const seenBarcodes = new Map<string, number>(); // barcode -> first Excel row number
            const parsedSelection: SelectedItem[] = [];

            for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                const excelRowNumber = i + 1; // 1-based row number in Excel
                if (!row || row.every(cell => String(cell ?? '').trim() === '')) {
                    continue; // Skip completely blank rows
                }

                const rawBarcode = barcodeColIdx !== -1 ? String(row[barcodeColIdx] ?? '').trim() : '';
                const rawSku = skuColIdx !== -1 ? String(row[skuColIdx] ?? '').trim() : '';
                const rawQtyCell = row[transferQtyColIdx];
                const rawQtyStr = String(rawQtyCell ?? '').trim();

                // Skip summary row if user added one
                const rowText = row.map(c => String(c ?? '').trim()).join(' ');
                if (!rawBarcode && !rawSku && (rowText.includes('รวมทั้งหมด') || rowText.includes('รวมสุทธิ'))) {
                    continue;
                }

                // 1. Validate Barcode / SKU presence
                if (!rawBarcode && !rawSku) {
                    if (rawQtyStr !== '' && rawQtyStr !== '0' && rawQtyStr !== '-') {
                        errors.push(`แถวที่ ${excelRowNumber}: มีการระบุจำนวนที่โอน (${rawQtyStr}) แต่ไม่ระบุบาร์โค้ดหรือ SKU`);
                    }
                    continue;
                }

                // 2. Lookup stockItem by Barcode (primary) or SKU (fallback)
                let stockItem: StockItem | undefined;
                if (rawBarcode) {
                    stockItem = stockMap.get(rawBarcode) || stockMap.get(rawBarcode.toUpperCase());
                    if (!stockItem) {
                        errors.push(
                            `แถวที่ ${excelRowNumber}: ไม่พบบาร์โค้ด "${rawBarcode}"${rawSku ? ` (SKU: ${rawSku})` : ''} ในสต็อกคงเหลือของสาขาต้นทาง (${fromChannel?.name || ''})`
                        );
                        continue;
                    }
                    // Validate SKU consistency if both Barcode and SKU are provided
                    if (rawSku && stockItem.product.sku && rawSku.toUpperCase() !== stockItem.product.sku.trim().toUpperCase()) {
                        errors.push(
                            `แถวที่ ${excelRowNumber}: บาร์โค้ด "${rawBarcode}" มีค่า SKU ในไฟล์ ("${rawSku}") ไม่ตรงกับระบบ ("${stockItem.product.sku}")`
                        );
                        continue;
                    }
                } else {
                    stockItem = skuMap.get(rawSku) || skuMap.get(rawSku.toUpperCase());
                    if (!stockItem) {
                        errors.push(
                            `แถวที่ ${excelRowNumber}: ไม่พบ SKU "${rawSku}" ในสต็อกคงเหลือของสาขาต้นทาง (${fromChannel?.name || ''})`
                        );
                        continue;
                    }
                }

                const normalizedKey = stockItem.barcode.toUpperCase();

                // 3. Validate Duplicate Item within the Excel file
                if (seenBarcodes.has(normalizedKey)) {
                    errors.push(
                        `แถวที่ ${excelRowNumber}: สินค้าบาร์โค้ด "${stockItem.barcode}"${stockItem.product.sku ? ` (SKU: ${stockItem.product.sku})` : ''} ซ้ำกับแถวที่ ${seenBarcodes.get(normalizedKey)}`
                    );
                    continue;
                }
                seenBarcodes.set(normalizedKey, excelRowNumber);

                // 4. If transfer quantity is blank, '-', or 0 -> user chose not to transfer this item
                if (rawQtyStr === '' || rawQtyStr === '-') {
                    continue;
                }

                const parsedQty = Number(rawQtyStr.replace(/,/g, ''));
                if (Number.isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 0) {
                    errors.push(
                        `แถวที่ ${excelRowNumber} (${stockItem.barcode}${stockItem.product.sku ? ` / ${stockItem.product.sku}` : ''}): จำนวนที่โอน "${rawQtyStr}" ไม่ถูกต้อง (ต้องเป็นจำนวนเต็มบวก หรือ 0 หากไม่ต้องการโอน)`
                    );
                    continue;
                }

                if (parsedQty === 0) {
                    continue; // 0 means do not transfer this item
                }

                // 5. Validate transfer quantity does not exceed remaining stock in source channel
                if (parsedQty > stockItem.remaining) {
                    const desc = [
                        stockItem.product.sku ? `SKU: ${stockItem.product.sku}` : null,
                        stockItem.product.code || stockItem.product.name,
                        stockItem.product.color ? `สี${stockItem.product.color}` : null,
                        stockItem.product.size ? `ไซส์ ${stockItem.product.size}` : null,
                    ].filter(Boolean).join(' ');
                    errors.push(
                        `แถวที่ ${excelRowNumber} (${stockItem.barcode} — ${desc}): จำนวนที่โอน (${parsedQty.toLocaleString()} ชิ้น) เกินสต็อกคงเหลือต้นทาง (${stockItem.remaining.toLocaleString()} ชิ้น)`
                    );
                    continue;
                }

                parsedSelection.push({
                    barcode: stockItem.barcode,
                    quantity: parsedQty,
                    maxQuantity: stockItem.remaining,
                    product: stockItem.product,
                });
            }

            // Block import if any row has validation errors
            if (errors.length > 0) {
                setImportErrors(errors);
                setImportedFileName(null);
                toastError(`พบข้อผิดพลาดในไฟล์ Excel ${errors.length} รายการ กรุณาแก้ไขไฟล์แล้วนำเข้าใหม่`);
                return;
            }

            // Block if no items have quantity > 0
            if (parsedSelection.length === 0) {
                setImportErrors(['ไม่พบรายการที่ระบุ "จำนวนที่โอน" มากกว่า 0 ในไฟล์ Excel']);
                setImportedFileName(null);
                return;
            }

            // All validations passed -> apply selection
            setSelectedItems(parsedSelection);
            setImportedFileName(file.name);
            setImportErrors([]);
            setShowConfirm(false);
            const totalImportedQty = parsedSelection.reduce((sum, item) => sum + item.quantity, 0);
            toastSuccess(`นำเข้าสำเร็จ ${parsedSelection.length} รายการ (รวม ${totalImportedQty.toLocaleString()} ชิ้น)`);
        } catch (err) {
            console.error('Import Excel error:', err);
            setImportErrors([err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ Excel ได้']);
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-700">
                                2. เลือกสินค้า ({availableStock.length.toLocaleString()} รายการ)
                            </h2>
                            {selectedItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowSelectedOnly(prev => !prev)}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                        showSelectedOnly
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                >
                                    {showSelectedOnly
                                        ? `แสดงเฉพาะที่เลือก (${selectedItems.length})`
                                        : `เลือกแล้ว ${selectedItems.length} รายการ`}
                                </button>
                            )}
                        </div>

                        {availableStock.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    disabled={exporting || stockLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    {exporting ? 'กำลัง Export...' : 'Export Excel'}
                                </button>

                                <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer ${importing || stockLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Upload className="h-3.5 w-3.5" />
                                    {importing ? 'กำลังตรวจสอบ...' : 'Import Excel'}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImportExcel}
                                        className="hidden"
                                        disabled={importing || stockLoading}
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1"
                                >
                                    {selectedItems.length === filteredStock.length && filteredStock.length > 0 ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Imported File Success Banner */}
                    {importedFileName && importErrors.length === 0 && (
                        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 text-xs text-emerald-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">
                                    นำเข้าจากไฟล์ <strong>{importedFileName}</strong> สำเร็จ — เลือกโอน <strong>{selectedItems.length.toLocaleString()}</strong> รายการ (รวม <strong>{totalQuantity.toLocaleString()}</strong> ชิ้น)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setImportedFileName(null);
                                    setSelectedItems([]);
                                    setShowSelectedOnly(false);
                                }}
                                className="text-emerald-700 hover:text-red-600 flex items-center gap-1 flex-shrink-0"
                                title="ล้างข้อมูลที่นำเข้า"
                            >
                                <X className="h-3.5 w-3.5" /> ล้าง
                            </button>
                        </div>
                    )}

                    {/* Import Validation Errors Box */}
                    {importErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>ไม่สามารถนำเข้าไฟล์ Excel ได้ พบข้อผิดพลาด {importErrors.length} รายการ (กรุณาแก้ไขไฟล์แล้วนำเข้าใหม่):</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImportErrors([])}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <ul className="list-disc list-inside text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto pl-1">
                                {importErrors.map((errMsg, idx) => (
                                    <li key={idx}>{errMsg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="ค้นหา barcode, SKU, ชื่อ, รหัส, สี..."
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
                                            <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                                                {stock.product.sku && <span className="text-slate-500 font-mono">SKU: {stock.product.sku}</span>}
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
