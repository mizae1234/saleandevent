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
    event: {
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
            router.push(`/pc/sales/event/${sale.event?.id}`);
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
                        href={sale.event ? `/pc/sales/event/${sale.event.id}` : '/pc/sales'}
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
            {sale.event && (
                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <Package className="h-5 w-5 text-emerald-600" />
                    <div>
                        <p className="font-medium text-slate-900">{sale.event.name}</p>
                        <p className="text-sm text-slate-500">{sale.event.location}</p>
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

            {/* Items List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                    <h2 className="font-medium text-slate-900">รายการสินค้า ({sale.items.length})</h2>
                </div>
                <div className="divide-y">
                    {sale.items.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                    <Tag className="h-5 w-5 text-slate-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900">{item.product.name}</p>
                                        {item.isFreebie && (
                                            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">
                                                ของแถม
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-3 w-3" />
                                            {item.product.code || item.barcode}
                                        </span>
                                        {(item.product.size || item.product.color) && (
                                            <span>
                                                {item.product.size && `Size: ${item.product.size}`}
                                                {item.product.size && item.product.color && ' • '}
                                                {item.product.color && `สี: ${item.product.color}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-medium text-slate-900">
                                    ฿{parseFloat(item.totalAmount.toString()).toLocaleString()}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {item.quantity} x ฿{parseFloat(item.unitPrice.toString()).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div className="flex justify-between text-slate-600">
                    <span>รวมสินค้า</span>
                    <span>฿{subtotal.toLocaleString()}</span>
                </div>
                {sale.discount && parseFloat(sale.discount.toString()) > 0 && (
                    <div className="flex justify-between text-red-500">
                        <span>ส่วนลด</span>
                        <span>-฿{parseFloat(sale.discount.toString()).toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                    <span>ยอดสุทธิ</span>
                    <span className={isCancelled ? 'text-slate-400 line-through' : 'text-emerald-600'}>
                        ฿{parseFloat(sale.totalAmount.toString()).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
