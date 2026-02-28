"use client";

import { Trophy, AlertTriangle, Package } from "lucide-react";

interface ProductSale {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
    color: string | null;
    qtySold: number;
    revenue: number;
}

interface DeadStockItem {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
    color: string | null;
    stockQty: number;
    soldQty: number;
}

interface Props {
    topProducts: ProductSale[];
    deadStock: DeadStockItem[];
}

function fmt(n: number) {
    return n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
}

export function ProductInsight({ topProducts, deadStock }: Props) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Top 10 สินค้าขายดี
                    </h3>
                </div>
                {topProducts.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-slate-400">ไม่มีข้อมูล</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-t border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-600">#</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">สินค้า</th>
                                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-600">ขาย</th>
                                    <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-600">รายได้</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {topProducts.map((p, i) => (
                                    <tr key={p.barcode} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-2.5">
                                            <span
                                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i < 3
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-100 text-slate-500"
                                                    }`}
                                            >
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-medium text-slate-900 truncate max-w-[200px]">
                                                {p.name}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {p.code || p.barcode}
                                                {p.size ? ` · ${p.size}` : ""}
                                                {p.color ? ` · ${p.color}` : ""}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-medium text-slate-700">
                                            {fmt(p.qtySold)}
                                        </td>
                                        <td className="px-6 py-2.5 text-right font-semibold text-emerald-600">
                                            ฿{fmt(p.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Dead Stock */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Dead Stock (สต็อกเหลือมาก - ขายน้อย)
                    </h3>
                </div>
                {deadStock.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-slate-400">ไม่มี Dead Stock</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-t border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-600">สินค้า</th>
                                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-600">คงเหลือ</th>
                                    <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-600">ขายได้</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {deadStock.map((p) => (
                                    <tr key={p.barcode} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-2.5">
                                            <div className="font-medium text-slate-900 truncate max-w-[200px]">
                                                {p.name}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {p.code || p.barcode}
                                                {p.size ? ` · ${p.size}` : ""}
                                                {p.color ? ` · ${p.color}` : ""}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                <Package className="h-3 w-3" />
                                                {fmt(p.stockQty)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2.5 text-right font-medium text-slate-700">
                                            {fmt(p.soldQty)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
