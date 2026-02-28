"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface SaleItem {
    id: string;
    quantity: number;
    unitPrice: any;
    totalPrice: any;
    product: {
        barcode: string;
        name: string;
        size: string | null;
        color: string | null;
    };
}

interface SaleData {
    id: string;
    receiptNo: string | null;
    totalAmount: any;
    paymentMethod: string | null;
    status: string;
    createdAt: string;
    items: SaleItem[];
    channel: {
        id: string;
        name: string;
    };
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: "เงินสด",
    transfer: "โอนเงิน",
    credit: "บัตรเครดิต",
};

export function SaleDetailClient({ sale }: { sale: SaleData }) {
    const totalAmount = Number(sale.totalAmount || 0);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/pc/sales/channel/${sale.channel.id}`}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">รายละเอียดบิลขาย</h1>
                    <p className="text-sm text-slate-500">{sale.channel.name}</p>
                </div>
            </div>

            {/* Receipt Info */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500">เลขที่บิล</span>
                        <p className="font-mono font-medium text-slate-900 mt-0.5">{sale.receiptNo || sale.id.slice(0, 8)}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">วันที่</span>
                        <p className="font-medium text-slate-900 mt-0.5">{format(new Date(sale.createdAt), "d MMM yyyy HH:mm")}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">ช่องทางชำระ</span>
                        <p className="font-medium text-slate-900 mt-0.5">{PAYMENT_LABELS[sale.paymentMethod || ''] || sale.paymentMethod || '-'}</p>
                    </div>
                    <div>
                        <span className="text-slate-500">ยอดรวม</span>
                        <p className="font-bold text-lg text-emerald-600 mt-0.5">฿{totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">รายการสินค้า ({sale.items.length} รายการ)</h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left font-semibold text-slate-600 px-6 py-3">สินค้า</th>
                            <th className="text-center font-semibold text-slate-600 px-4 py-3">ไซส์</th>
                            <th className="text-center font-semibold text-slate-600 px-4 py-3">จำนวน</th>
                            <th className="text-right font-semibold text-slate-600 px-6 py-3">ราคา/ชิ้น</th>
                            <th className="text-right font-semibold text-slate-600 px-6 py-3">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50">
                                <td className="px-6 py-3">
                                    <div className="font-medium text-slate-900">{item.product.name}</div>
                                    <div className="text-xs text-slate-400 font-mono">{item.product.barcode}</div>
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600">{item.product.size || '-'}</td>
                                <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                                <td className="px-6 py-3 text-right text-slate-600">฿{Number(item.unitPrice).toLocaleString()}</td>
                                <td className="px-6 py-3 text-right font-medium text-slate-900">฿{Number(item.totalPrice).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50/50">
                            <td colSpan={4} className="px-6 py-3 text-right font-semibold text-slate-700">ยอดรวมทั้งหมด</td>
                            <td className="px-6 py-3 text-right font-bold text-lg text-emerald-600">฿{totalAmount.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
