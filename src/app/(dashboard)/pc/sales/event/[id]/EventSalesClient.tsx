"use client";

import { useState } from 'react';
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Download, Eye, Receipt, ArrowLeft, Package, Calendar } from "lucide-react";
import Link from "next/link";
import * as XLSX from 'xlsx';

interface SaleItem {
    quantity: number;
    product: {
        name: string;
        code: string | null;
    };
}

interface Sale {
    id: string;
    billCode: string | null;
    totalAmount: any;
    discount: any;
    status: string;
    soldAt: Date;
    items: SaleItem[];
}

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface Props {
    event: Event;
    sales: Sale[];
}

export function EventSalesClient({ event, sales }: Props) {
    const [dateFilter, setDateFilter] = useState<string>('');

    // Calculate stats
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);
    const totalItems = sales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    const todaySales = sales.filter(s =>
        format(new Date(s.soldAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    );
    const todayTotal = todaySales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);

    // Filter sales by date
    const filteredSales = dateFilter
        ? sales.filter(s => format(new Date(s.soldAt), 'yyyy-MM-dd') === dateFilter)
        : sales;

    // Get unique dates for filter
    const uniqueDates = [...new Set(sales.map(s => format(new Date(s.soldAt), 'yyyy-MM-dd')))].sort().reverse();

    // Export to Excel
    const exportToExcel = () => {
        const data = filteredSales.map((sale, index) => ({
            'ลำดับ': index + 1,
            'เลขบิล': sale.billCode || sale.id.slice(0, 8),
            'วันที่': format(new Date(sale.soldAt), 'dd/MM/yyyy'),
            'เวลา': format(new Date(sale.soldAt), 'HH:mm'),
            'จำนวนรายการ': sale.items.length,
            'จำนวนชิ้น': sale.items.reduce((sum, i) => sum + i.quantity, 0),
            'ส่วนลด': parseFloat(sale.discount?.toString() || '0'),
            'ยอดรวม': parseFloat(sale.totalAmount.toString()),
            'สถานะ': sale.status === 'active' ? 'ปกติ' : 'ยกเลิก'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'รายการขาย');

        // Set column widths
        ws['!cols'] = [
            { wch: 6 },   // ลำดับ
            { wch: 15 },  // เลขบิล
            { wch: 12 },  // วันที่
            { wch: 8 },   // เวลา
            { wch: 12 },  // จำนวนรายการ
            { wch: 10 },  // จำนวนชิ้น
            { wch: 10 },  // ส่วนลด
            { wch: 12 },  // ยอดรวม
            { wch: 10 },  // สถานะ
        ];

        XLSX.writeFile(wb, `${event.code}_sales_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/pc/sales"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
                        <p className="text-slate-500 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {event.code} • {event.location}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards - Moved to Top */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-slate-500">บิลทั้งหมด</p>
                    <p className="text-2xl font-bold text-slate-900">{sales.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-slate-500">ยอดรวม</p>
                    <p className="text-2xl font-bold text-emerald-600">฿{totalSales.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-slate-500">สินค้าขายได้</p>
                    <p className="text-2xl font-bold text-slate-900">{totalItems} ชิ้น</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm bg-gradient-to-r from-emerald-50 to-white">
                    <p className="text-sm text-slate-500">ยอดวันนี้</p>
                    <p className="text-2xl font-bold text-emerald-600">฿{todayTotal.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{todaySales.length} บิล</p>
                </div>
            </div>

            {/* Filter & Actions Bar */}
            <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">ทุกวัน</option>
                            {uniqueDates.map(date => (
                                <option key={date} value={date}>
                                    {format(new Date(date), 'd MMMM yyyy', { locale: th })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="text-sm text-slate-500">
                        {filteredSales.length} รายการ
                    </span>
                </div>

                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Export Excel
                </button>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#EFF4FA] text-slate-700">
                            <th className="text-left px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-l-0">เลขบิล</th>
                            <th className="text-left px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">วันที่/เวลา</th>
                            <th className="text-right px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">รายการ</th>
                            <th className="text-right px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">ส่วนลด</th>
                            <th className="text-right px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">ยอดรวม</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">สถานะ</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-r-0"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-slate-400 border border-slate-200">
                                    <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                    ไม่มีรายการขาย
                                </td>
                            </tr>
                        ) : (
                            filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 border border-slate-200 border-l-0 text-sm font-medium text-slate-900">
                                        {sale.billCode || sale.id.slice(0, 8)}
                                    </td>
                                    <td className="px-4 py-3 border border-slate-200">
                                        <div className="text-sm text-slate-900">
                                            {format(new Date(sale.soldAt), 'd MMM yyyy', { locale: th })}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {format(new Date(sale.soldAt), 'HH:mm น.')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right border border-slate-200">
                                        <span className="text-sm text-slate-600">
                                            {sale.items.length} รายการ
                                        </span>
                                        <div className="text-xs text-slate-400">
                                            {sale.items.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right border border-slate-200">
                                        {sale.discount && parseFloat(sale.discount.toString()) > 0 ? (
                                            <span className="text-sm text-red-500">
                                                -฿{parseFloat(sale.discount.toString()).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right border border-slate-200">
                                        <span className={`text-sm font-bold ${sale.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                            ฿{parseFloat(sale.totalAmount.toString()).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center border border-slate-200">
                                        {sale.status === 'cancelled' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                                ยกเลิก
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                                                สำเร็จ
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center border border-slate-200 border-r-0">
                                        <Link
                                            href={`/pc/sales/${sale.id}`}
                                            className="text-slate-400 hover:text-emerald-600 transition-colors"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                        {/* Summary Footer Row matching the style */}
                        {filteredSales.length > 0 && (
                            <tr className="bg-[#EFF4FA] font-bold text-slate-900">
                                <td colSpan={2} className="px-4 py-3 border border-slate-200 border-l-0 text-right">
                                    Grand Total
                                </td>
                                <td className="px-4 py-3 border border-slate-200 text-right">
                                    {filteredSales.reduce((sum, s) => sum + s.items.length, 0)} รายการ
                                </td>
                                <td className="px-4 py-3 border border-slate-200 text-right">
                                    {/* Discount sum if needed, or stick to total amount */}
                                </td>
                                <td className="px-4 py-3 border border-slate-200 text-right">
                                    ฿{filteredSales.reduce((sum, s) => sum + (s.status !== 'cancelled' ? parseFloat(s.totalAmount.toString()) : 0), 0).toLocaleString()}
                                </td>
                                <td colSpan={2} className="px-4 py-3 border border-slate-200 border-r-0"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
