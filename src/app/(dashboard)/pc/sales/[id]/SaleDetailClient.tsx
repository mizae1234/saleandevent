"use client";

import { useState } from 'react';
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Receipt, ArrowLeft, Package, XCircle, Tag, Hash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cancelSale } from "@/actions/sale-actions";

interface SaleItem {
    id: string;
    barcode: string;
    quantity: number;
    unitPrice: any;
    totalAmount: any;
    isFreebie: boolean;
    product: {
        name: string;
        code: string | null;
        size: string | null;
        color: string | null;
    };
}

interface Sale {
    id: string;
    totalAmount: any;
    discount: any;
    status: string;
    soldAt: Date;
    cancelledAt: Date | null;
    cancelReason: string | null;
    channel: {
        id: string;
        name: string;
        location: string;
    } | null;
    items: SaleItem[];
}

interface Props {
    sale: Sale;
}

export function SaleDetailClient({ sale }: Props) {
    const router = useRouter();
    const [cancelReason, setCancelReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const handleCancelSale = async () => {
        if (!cancelReason.trim()) {
            alert('กรุณาระบุเหตุผลในการยกเลิก');
            return;
        }

        setIsLoading(true);
        try {
            await cancelSale(sale.id, cancelReason);
            router.push(`/pc/sales/channel/${sale.channel?.id}`);
            router.refresh();
        } catch (error: any) {
            alert('ไม่สามารถยกเลิกบิลได้: ' + error.message);
        } finally {
            setIsLoading(false);
            setShowCancelDialog(false);
        }
    };

    const isCancelled = sale.status === 'cancelled';
    const subtotal = sale.items.reduce((sum, item) => sum + parseFloat(item.totalAmount.toString()), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={sale.channel ? `/pc/sales/channel/${sale.channel.id}` : '/pc/sales'}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900">รายละเอียดบิล</h1>
                            {isCancelled && (
                                <span className="px-2 py-1 bg-red-100 text-red-600 text-sm rounded-full">
                                    ยกเลิกแล้ว
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500">
                            {format(new Date(sale.soldAt), "d MMMM yyyy เวลา HH:mm น.", { locale: th })}
                        </p>
                    </div>
                </div>

                {!isCancelled && (
                    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                        <AlertDialogTrigger asChild>
                            <button
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                <XCircle className="h-4 w-4" />
                                ยกเลิกบิล
                            </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันการยกเลิกบิล?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    การยกเลิกบิลจะคืนสต็อกสินค้าทั้งหมดในบิลนี้กลับไปยัง Event
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <label className="text-sm font-medium text-slate-700">
                                    เหตุผลในการยกเลิก *
                                </label>
                                <input
                                    type="text"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="เช่น ลูกค้าเปลี่ยนใจ, คีย์ผิด"
                                    className="w-full mt-1 px-3 py-2 bg-transparent border-b border-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancelSale}
                                    disabled={isLoading || !cancelReason.trim()}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    {isLoading ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกบิล'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            {/* Event Info */}
            {sale.channel && (
                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <Package className="h-5 w-5 text-emerald-600" />
                    <div>
                        <p className="font-medium text-slate-900">{sale.channel.name}</p>
                        <p className="text-sm text-slate-500">{sale.channel.location}</p>
                    </div>
                </div>
            )}

            {/* Cancelled Info */}
            {isCancelled && sale.cancelledAt && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">บิลนี้ถูกยกเลิกแล้ว</span>
                    </div>
                    <p className="text-sm text-red-600">
                        ยกเลิกเมื่อ: {format(new Date(sale.cancelledAt), "d MMM yyyy HH:mm น.", { locale: th })}
                    </p>
                    {sale.cancelReason && (
                        <p className="text-sm text-red-600">เหตุผล: {sale.cancelReason}</p>
                    )}
                </div>
            )}

            {/* Items List - Grid Style */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#EFF4FA] text-slate-700">
                            <th className="text-left px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-l-0">สินค้า</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">ราคา/หน่วย</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">จำนวน</th>
                            <th className="text-right px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-r-0">รวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 border border-slate-200 border-l-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
                                            <Package className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-slate-900 line-clamp-1 text-sm">{item.product.name}</p>
                                                {item.isFreebie && (
                                                    <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded flex-shrink-0">
                                                        ของแถม
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{item.product.code || item.barcode}</span>
                                                {(item.product.size || item.product.color) && (
                                                    <span>
                                                        {item.product.size && `Size: ${item.product.size}`}
                                                        {item.product.size && item.product.color && ' • '}
                                                        {item.product.color && `${item.product.color}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200 text-sm md:text-base">
                                    ฿{parseFloat(item.unitPrice.toString()).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200 text-sm md:text-base">
                                    {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-right border border-slate-200 border-r-0 font-medium text-slate-900">
                                    ฿{parseFloat(item.totalAmount.toString()).toLocaleString()}
                                </td>
                            </tr>
                        ))}

                        {/* Summary Footer as part of table */}
                        <tr className="bg-[#EFF4FA]">
                            <td colSpan={3} className="px-4 py-3 border border-slate-200 border-l-0 text-right font-bold text-slate-900">
                                รวมสินค้า
                            </td>
                            <td className="px-4 py-3 border border-slate-200 border-r-0 text-right font-bold text-slate-900">
                                ฿{subtotal.toLocaleString()}
                            </td>
                        </tr>
                        {sale.discount && parseFloat(sale.discount.toString()) > 0 && (
                            <tr className="bg-red-50">
                                <td colSpan={3} className="px-4 py-3 border border-slate-200 border-l-0 text-right font-bold text-red-600">
                                    ส่วนลด
                                </td>
                                <td className="px-4 py-3 border border-slate-200 border-r-0 text-right font-bold text-red-600">
                                    -฿{parseFloat(sale.discount.toString()).toLocaleString()}
                                </td>
                            </tr>
                        )}
                        <tr className="bg-emerald-50">
                            <td colSpan={3} className="px-4 py-3 border border-slate-200 border-l-0 text-right font-bold text-emerald-900 text-lg">
                                ยอดสุทธิ
                            </td>
                            <td className={`px-4 py-3 border border-slate-200 border-r-0 text-right font-bold text-lg ${isCancelled ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>
                                ฿{parseFloat(sale.totalAmount.toString()).toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
