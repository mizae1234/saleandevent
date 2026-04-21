"use client";

import { useState, useTransition, useMemo } from "react";
import { ArrowLeft, Search, XCircle, CheckCircle2, Ban, ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Spinner } from "@/components/shared";
import Link from "next/link";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cancelSale } from "@/actions/sale-actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

type SaleItem = {
    id: string;
    barcode: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    isFreebie: boolean;
    product: {
        name: string;
        code: string | null;
        size: string | null;
        color: string | null;
    };
};

type Sale = {
    id: string;
    billCode: string | null;
    totalAmount: number;
    discount: number;
    status: string;
    soldAt: string;
    items: SaleItem[];
};

type Props = {
    event: {
        id: string;
        name: string;
        code: string;
        location: string;
    };
    sales: Sale[];
    backHref?: string;
};

const PAGE_SIZE = 20;

export function EventSalesClient({ event, sales, backHref }: Props) {
    const router = useRouter();
    const { toastSuccess, toastError } = useToast();
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isPending, startTransition] = useTransition();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [exporting, setExporting] = useState(false);

    const filtered = useMemo(() => sales.filter(sale => {
        if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

        if (startDate || endDate) {
            const saleDateStr = format(new Date(sale.soldAt), 'yyyy-MM-dd');
            if (startDate && saleDateStr < startDate) return false;
            if (endDate && saleDateStr > endDate) return false;
        }

        if (search) {
            const q = search.toLowerCase();
            const matchBill = sale.billCode?.toLowerCase().includes(q);
            const matchItem = sale.items.some(
                i => i.product.name.toLowerCase().includes(q) || i.barcode.toLowerCase().includes(q)
            );
            if (!matchBill && !matchItem) return false;
        }
        return true;
    }), [sales, statusFilter, search, startDate, endDate]);

    const visible = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;

    const totalActive = sales.filter(s => s.status === 'active').reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalCount = sales.filter(s => s.status === 'active').length;

    const toggleExpand = (id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleExportExcel = async () => {
        if (filtered.length === 0) return;
        setExporting(true);
        try {
            const XLSX = await import("xlsx");

            // Sheet 1: สรุปรายการขาย (Bill Summary)
            const summaryRows = filtered.map((sale, idx) => ({
                "#": idx + 1,
                "เลขบิล": sale.billCode || sale.id.slice(0, 8),
                "วันที่": format(new Date(sale.soldAt), "d/MM/yyyy HH:mm", { locale: th }),
                "จำนวนรายการ": sale.items.length,
                "ส่วนลด": Number(sale.discount),
                "ยอดรวม": Number(sale.totalAmount),
                "สถานะ": sale.status === 'active' ? 'สำเร็จ' : 'ยกเลิก',
            }));

            const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
            wsSummary["!cols"] = [
                { wch: 5 },  // #
                { wch: 24 }, // เลขบิล
                { wch: 18 }, // วันที่
                { wch: 12 }, // จำนวนรายการ
                { wch: 10 }, // ส่วนลด
                { wch: 12 }, // ยอดรวม
                { wch: 10 }, // สถานะ
            ];

            // Sheet 2: รายละเอียดสินค้า (Item Details)
            const detailRows: Record<string, string | number>[] = [];
            filtered.forEach(sale => {
                sale.items.forEach(item => {
                    detailRows.push({
                        "เลขบิล": sale.billCode || sale.id.slice(0, 8),
                        "วันที่": format(new Date(sale.soldAt), "d/MM/yyyy HH:mm", { locale: th }),
                        "รหัสสินค้า": item.product.code || "-",
                        "Barcode": item.barcode,
                        "ชื่อสินค้า": item.product.name,
                        "ไซส์": item.product.size || "-",
                        "สี": item.product.color || "-",
                        "จำนวน": item.quantity,
                        "ราคาต่อชิ้น": Number(item.unitPrice),
                        "รวม": Number(item.totalAmount),
                        "แถม": item.isFreebie ? "ใช่" : "-",
                        "สถานะบิล": sale.status === 'active' ? 'สำเร็จ' : 'ยกเลิก',
                    });
                });
            });

            const wsDetail = XLSX.utils.json_to_sheet(detailRows);
            wsDetail["!cols"] = [
                { wch: 24 }, // เลขบิล
                { wch: 18 }, // วันที่
                { wch: 14 }, // รหัสสินค้า
                { wch: 16 }, // Barcode
                { wch: 30 }, // ชื่อสินค้า
                { wch: 8 },  // ไซส์
                { wch: 10 }, // สี
                { wch: 8 },  // จำนวน
                { wch: 12 }, // ราคาต่อชิ้น
                { wch: 12 }, // รวม
                { wch: 6 },  // แถม
                { wch: 10 }, // สถานะบิล
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปรายการขาย");
            XLSX.utils.book_append_sheet(wb, wsDetail, "รายละเอียดสินค้า");

            const d = new Date();
            const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            XLSX.writeFile(wb, `sales_${event.code}_${dateStr}.xlsx`);
            toastSuccess(`Export สำเร็จ ${filtered.length} บิล, ${detailRows.length} รายการ`);
        } catch {
            toastError("เกิดข้อผิดพลาดในการ Export");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={backHref || "/pc/sales"}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">รายการขาย</h1>
                    <p className="text-slate-500">{event.name} ({event.code}) · {event.location}</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 mb-1">จำนวนบิล</p>
                    <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-emerald-600 mb-1">ยอดขายรวม</p>
                    <p className="text-2xl font-bold text-emerald-700">฿{totalActive.toLocaleString()}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาบิล, สินค้า..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                        />
                    </div>
                </div>
                
                {/* Date and Status Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setVisibleCount(PAGE_SIZE); }}
                            className="flex-1 sm:w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 text-slate-600"
                        />
                        <span className="text-slate-400 text-sm">ถึง</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setVisibleCount(PAGE_SIZE); }}
                            className="flex-1 sm:w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 text-slate-600"
                        />
                    </div>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden w-full sm:w-auto">
                        {[
                            { key: 'all' as const, label: 'ทั้งหมด' },
                            { key: 'active' as const, label: 'สำเร็จ' },
                            { key: 'cancelled' as const, label: 'ยกเลิก' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setStatusFilter(f.key); setVisibleCount(PAGE_SIZE); }}
                                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${statusFilter === f.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Result count + Export Button */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                    แสดง {visible.length} จาก {filtered.length} รายการ
                </p>
                <button
                    onClick={handleExportExcel}
                    disabled={exporting || filtered.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {exporting ? <Spinner size="xs" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                    {exporting ? "กำลัง Export..." : "Export Excel"}
                </button>
            </div>

            {/* Sales List */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        ไม่พบรายการขาย
                    </div>
                ) : (
                    <>
                        {visible.map(sale => {
                            const isExpanded = expandedId === sale.id;
                            const isCancelled = sale.status === 'cancelled';

                            return (
                                <div
                                    key={sale.id}
                                    className={`bg-white border rounded-xl overflow-hidden transition-all ${isCancelled ? 'border-red-200 opacity-60' : 'border-slate-200'}`}
                                >
                                    {/* Sale Header - Clickable */}
                                    <button
                                        onClick={() => toggleExpand(sale.id)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                                    >
                                        {isCancelled ? (
                                            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                        )}

                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="font-semibold text-slate-900 text-sm">
                                                {sale.billCode || sale.id.slice(0, 8)}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-2">
                                                {format(new Date(sale.soldAt), "d MMM yy HH:mm", { locale: th })}
                                            </span>
                                        </div>

                                        <span className="text-xs text-slate-400 mr-1">
                                            {sale.items.length} รายการ
                                        </span>

                                        <span className={`text-sm font-bold mr-2 ${isCancelled ? 'text-red-500 line-through' : 'text-emerald-700'}`}>
                                            ฿{Number(sale.totalAmount).toLocaleString()}
                                        </span>

                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                        )}
                                    </button>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <>
                                            {/* Items */}
                                            <div className="px-4 py-2 space-y-1 border-t border-slate-100 bg-slate-50/50">
                                                {sale.items.map(item => (
                                                    <div key={item.id} className="flex items-start justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                                                        <div className="flex flex-col pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-700 font-medium">{item.product.name}</span>
                                                                {item.isFreebie && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 font-medium">แถม</span>
                                                                )}
                                                                <span className="text-slate-500 font-medium text-xs">×{item.quantity}</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
                                                                {item.product.code && <span>{item.product.code}</span>}
                                                                {item.product.size && <span>• ไซส์: {item.product.size}</span>}
                                                                {item.product.color && <span>• สี: {item.product.color}</span>}
                                                            </div>
                                                        </div>
                                                        <span className="text-slate-600 mt-0.5">
                                                            ฿{Number(item.totalAmount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                                {Number(sale.discount) > 0 && (
                                                    <div className="flex items-center justify-between text-sm py-1 text-red-500">
                                                        <span>ส่วนลด</span>
                                                        <span>-฿{Number(sale.discount).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cancel Button / Confirmation */}
                                            {sale.status === 'active' && (
                                                cancellingId === sale.id ? (
                                                    <div className="px-4 py-3 bg-red-50 border-t border-red-100 space-y-2">
                                                        <p className="text-xs font-medium text-red-700">ยืนยันยกเลิกบิลนี้?</p>
                                                        <input
                                                            type="text"
                                                            placeholder="ระบุเหตุผล (ไม่บังคับ)"
                                                            value={cancelReason}
                                                            onChange={(e) => setCancelReason(e.target.value)}
                                                            className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => { setCancellingId(null); setCancelReason(""); }}
                                                                className="flex-1 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                                                            >
                                                                ไม่ยกเลิก
                                                            </button>
                                                            <button
                                                                disabled={isPending}
                                                                onClick={() => {
                                                                    startTransition(async () => {
                                                                        await cancelSale(sale.id, cancelReason || 'ยกเลิกโดยพนักงาน');
                                                                        setCancellingId(null);
                                                                        setCancelReason("");
                                                                        router.refresh();
                                                                    });
                                                                }}
                                                                className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                                            >
                                                                {isPending ? <Spinner size="xs" /> : <Ban className="h-3 w-3" />}
                                                                ยืนยันยกเลิก
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-2 border-t border-slate-100">
                                                        <button
                                                            onClick={() => setCancellingId(sale.id)}
                                                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            ยกเลิกบิล
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Load More */}
                        {hasMore && (
                            <button
                                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                                className="w-full py-3 text-sm font-medium text-indigo-600 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 transition-colors"
                            >
                                โหลดเพิ่ม ({filtered.length - visibleCount} รายการ)
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
