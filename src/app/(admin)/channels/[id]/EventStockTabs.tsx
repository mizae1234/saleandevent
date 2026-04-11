"use client";

import { useState, useMemo } from "react";
import { Package, ClipboardList, Truck, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { EmptyState, Spinner } from "@/components/shared";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useToast } from "@/components/ui/toast";

const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const ITEMS_PER_PAGE = 10;

interface StockItem {
    id: string;
    barcode: string;
    quantity: number;
    soldQuantity: number;
    product: {
        name: string;
        code: string | null;
        size: string | null;
        color: string | null;
        producttype: string | null;
    };
}

interface StockRequest {
    id: string;
    requestType: string;
    status: string;
    requestedTotalQuantity: number;
    notes: string | null;
    createdAt: string;
    allocatedTotal: number;
    receivedTotal: string | null;
    shipment: { provider: string | null; trackingNumber: string | null } | null;
}

interface GroupedRow {
    no: number;
    name: string;
    code: string;
    color: string;
    sizes: Record<string, { qty: number; sold: number }>;
    totalQty: number;
    totalSold: number;
}

interface Props {
    stock: StockItem[];
    stockRequests: StockRequest[];
    channelName: string;
    channelCode: string;
}

const requestStatusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-600' },
    submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
    allocated: { label: 'จัดสรรแล้ว', color: 'bg-indigo-100 text-indigo-700' },
    packed: { label: 'แพ็คแล้ว', color: 'bg-purple-100 text-purple-700' },
    shipped: { label: 'จัดส่งแล้ว', color: 'bg-cyan-100 text-cyan-700' },
    received: { label: 'รับแล้ว', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
};

export function EventStockTabs({ stock, stockRequests, channelName, channelCode }: Props) {
    const [activeTab, setActiveTab] = useState<'requests' | 'stock'>(stock.length > 0 ? 'stock' : 'requests');
    const [stockPage, setStockPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const { toastError, toastSuccess } = useToast();

    const handleExport = async () => {
        if (groupedRows.length === 0) return;
        setExporting(true);
        try {
            const XLSX = await import("xlsx");

            // Same format as web table: grouped by code+color, size spread as columns
            const rows = groupedRows.map((row) => {
                const r: Record<string, string | number> = {
                    "#": row.no,
                    "ชื่อสินค้า": row.name,
                    "รุ่น": row.code,
                    "สี": row.color,
                };
                for (const size of SIZES) {
                    r[size] = row.sizes[size] ? row.sizes[size].qty - row.sizes[size].sold : 0;
                }
                r["รวมรับเข้า"] = row.totalQty;
                r["ขายแล้ว"] = row.totalSold;
                r["คงเหลือ"] = row.totalQty - row.totalSold;
                return r;
            });

            // Totals row
            const totalsRow: Record<string, string | number> = {
                "#": "",
                "ชื่อสินค้า": "",
                "รุ่น": "รวมทั้งหมด",
                "สี": "",
            };
            for (const size of SIZES) {
                totalsRow[size] = sizeTotals[size].qty - sizeTotals[size].sold;
            }
            totalsRow["รวมรับเข้า"] = totalStock;
            totalsRow["ขายแล้ว"] = totalSold;
            totalsRow["คงเหลือ"] = totalStock - totalSold;
            rows.push(totalsRow);

            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [
                { wch: 5 },  // #
                { wch: 30 }, // ชื่อสินค้า
                { wch: 14 }, // รุ่น
                { wch: 12 }, // สี
                ...SIZES.map(() => ({ wch: 8 })), // S M L XL 2XL 3XL
                { wch: 10 }, // รวมรับเข้า
                { wch: 10 }, // ขายแล้ว
                { wch: 10 }, // คงเหลือ
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "สต็อก");

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `stock_${channelCode}_${dateStr}.xlsx`);
            toastSuccess(`Export สำเร็จ ${groupedRows.length} รายการ`);
        } catch {
            toastError("เกิดข้อผิดพลาดในการ Export");
        } finally {
            setExporting(false);
        }
    };

    // Group stock by code + color
    const groupedRows: GroupedRow[] = useMemo(() => {
        const map = new Map<string, GroupedRow>();
        let counter = 0;

        for (const s of stock) {
            const key = `${s.product.code || s.barcode}__${s.product.color || ''}`;
            let row = map.get(key);
            if (!row) {
                counter++;
                row = {
                    no: counter,
                    name: s.product.name || s.product.producttype || '',
                    code: s.product.code || s.barcode,
                    color: s.product.color || '-',
                    sizes: {},
                    totalQty: 0,
                    totalSold: 0,
                };
                map.set(key, row);
            }
            if (s.product.size) {
                if (row.sizes[s.product.size]) {
                    row.sizes[s.product.size].qty += s.quantity;
                    row.sizes[s.product.size].sold += s.soldQuantity;
                } else {
                    row.sizes[s.product.size] = { qty: s.quantity, sold: s.soldQuantity };
                }
            }
            row.totalQty += s.quantity;
            row.totalSold += s.soldQuantity;
        }

        return Array.from(map.values());
    }, [stock]);

    // Size totals
    const sizeTotals = useMemo(() => {
        const totals: Record<string, { qty: number; sold: number }> = {};
        for (const s of SIZES) {
            totals[s] = { qty: 0, sold: 0 };
            for (const r of groupedRows) {
                if (r.sizes[s]) {
                    totals[s].qty += r.sizes[s].qty;
                    totals[s].sold += r.sizes[s].sold;
                }
            }
        }
        return totals;
    }, [groupedRows]);

    const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
    const totalSold = stock.reduce((sum, s) => sum + s.soldQuantity, 0);

    const tabs = [
        { key: 'stock' as const, label: `สต็อกปัจจุบัน (${groupedRows.length})`, icon: Package },
        { key: 'requests' as const, label: `คำขอสินค้า (${stockRequests.length})`, icon: ClipboardList },
    ];

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
            {/* Tabs + Export Button */}
            <div className="flex items-center justify-between border-b border-slate-200">
                <div className="flex">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-teal-600 text-teal-700'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                {activeTab === 'stock' && stock.length > 0 && (
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="mr-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {exporting ? <Spinner size="sm" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        {exporting ? "กำลัง Export..." : "Export Excel"}
                    </button>
                )}
            </div>

            {/* Tab: Stock */}
            {activeTab === 'stock' && (
                stock.length === 0 ? (
                    <EmptyState icon={Package} message="ยังไม่มีสต็อก" className="py-6" />
                ) : (
                    <div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="text-center p-3 text-xs font-semibold text-slate-600 w-10">#</th>
                                        <th className="text-left p-3 text-xs font-semibold text-slate-600">ชื่อสินค้า</th>
                                        <th className="text-left p-3 text-xs font-semibold text-slate-600">รุ่น</th>
                                        <th className="text-center p-3 text-xs font-semibold text-slate-600">สี</th>
                                        {SIZES.map(s => (
                                            <th key={s} className="text-center p-3 text-xs font-semibold text-slate-600 w-14">{s}</th>
                                        ))}
                                        <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">รวม</th>
                                        <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">ขาย</th>
                                        <th className="text-center p-3 text-xs font-semibold text-slate-600 w-14">คงเหลือ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {groupedRows.slice((stockPage - 1) * ITEMS_PER_PAGE, stockPage * ITEMS_PER_PAGE).map(row => (
                                        <tr key={`${row.code}-${row.color}`} className="hover:bg-slate-50">
                                            <td className="p-3 text-center text-slate-400">{row.no}</td>
                                            <td className="p-3 text-slate-700 text-xs">{row.name}</td>
                                            <td className="p-3 font-semibold text-teal-700">{row.code}</td>
                                            <td className="p-3 text-center text-slate-700">{row.color}</td>
                                            {SIZES.map(s => (
                                                <td key={s} className="p-3 text-center">
                                                    {row.sizes[s] ? (
                                                        <span className="font-medium text-slate-900">
                                                            {row.sizes[s].qty - row.sizes[s].sold}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="p-3 text-center text-slate-500">{row.totalQty}</td>
                                            <td className="p-3 text-center text-blue-600 font-medium">{row.totalSold}</td>
                                            <td className="p-3 text-center font-bold text-emerald-700">{row.totalQty - row.totalSold}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                                        {SIZES.map(s => (
                                            <td key={s} className="p-3 text-center font-bold text-slate-700">
                                                {(sizeTotals[s].qty - sizeTotals[s].sold) > 0 ? sizeTotals[s].qty - sizeTotals[s].sold : '-'}
                                            </td>
                                        ))}
                                        <td className="p-3 text-center font-bold text-slate-600">{totalStock}</td>
                                        <td className="p-3 text-center font-bold text-blue-600">{totalSold}</td>
                                        <td className="p-3 text-center font-bold text-emerald-700 text-base">{totalStock - totalSold}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {/* Pagination */}
                        {groupedRows.length > ITEMS_PER_PAGE && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                                <p className="text-xs text-slate-500">
                                    แสดง {(stockPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(stockPage * ITEMS_PER_PAGE, groupedRows.length)} จาก {groupedRows.length} รายการ
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setStockPage(p => Math.max(1, p - 1))}
                                        disabled={stockPage === 1}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                                    </button>
                                    {Array.from({ length: Math.ceil(groupedRows.length / ITEMS_PER_PAGE) }, (_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setStockPage(i + 1)}
                                            className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${stockPage === i + 1
                                                ? 'bg-teal-600 text-white'
                                                : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setStockPage(p => Math.min(Math.ceil(groupedRows.length / ITEMS_PER_PAGE), p + 1))}
                                        disabled={stockPage >= Math.ceil(groupedRows.length / ITEMS_PER_PAGE)}
                                        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4 text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* Tab: Requests */}
            {activeTab === 'requests' && (
                <div className="divide-y divide-slate-100">
                    {stockRequests.length === 0 ? (
                        <EmptyState icon={ClipboardList} message="ยังไม่มีคำขอสินค้า" className="py-6" />
                    ) : (
                        stockRequests.map(req => {
                            const reqStatus = requestStatusConfig[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
                            return (
                                <div key={req.id} className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reqStatus.color}`}>
                                                {reqStatus.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(req.createdAt), 'd MMM yy HH:mm', { locale: th })}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-400">ขอ</p>
                                            <p className="font-semibold text-slate-900">{req.requestedTotalQuantity.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">จัดสรร</p>
                                            <p className="font-semibold text-slate-900">{req.allocatedTotal > 0 ? req.allocatedTotal.toLocaleString() : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">รับแล้ว</p>
                                            <p className="font-semibold text-slate-900">{req.receivedTotal || '-'}</p>
                                        </div>
                                    </div>
                                    {req.shipment && (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                            <Truck className="h-3.5 w-3.5" />
                                            {req.shipment.provider} · {req.shipment.trackingNumber}
                                        </div>
                                    )}
                                    {req.notes && (
                                        <p className="mt-2 text-xs text-slate-500 italic">📝 {req.notes}</p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
