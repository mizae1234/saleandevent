"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package, MapPin, RefreshCw, Check, ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
}

interface Product {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
}

interface RequestItem {
    id: string;
    barcode: string;
    quantity: number;
    product: Product;
}

interface StockRequest {
    id: string;
    eventId: string;
    status: string;
    createdAt: Date;
    approvedAt: Date | null;
    event: Event;
    items: RequestItem[];
}

interface Props {
    request: StockRequest;
}

export function RefillPackingClient({ request }: Props) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);
    const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});

    const allPacked = request.items.every(item => packedItems[item.id]);
    const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);

    const togglePacked = (itemId: string) => {
        setPackedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const handleMarkPacked = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch(`/api/stock-requests/${request.id}/pack`, {
                method: 'POST'
            });
            if (res.ok) {
                router.push('/warehouse/packing');
                router.refresh();
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/warehouse/packing"
                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับหน้างานรอแพ็ค
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-blue-500" />
                        แพคของ - คำขอเบิกเพิ่ม
                    </h1>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <Package className="h-4 w-4" />
                    {request.status === 'approved' ? 'รอแพค' : request.status}
                </span>
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 text-white rounded-lg">
                        <RefreshCw className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg text-slate-900">{request.event.name}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <span className="font-mono">{request.event.code}</span>
                            <span>•</span>
                            <MapPin className="h-3 w-3" />
                            {request.event.location}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
                        <p className="text-xs text-slate-500">ชิ้นทั้งหมด</p>
                    </div>
                </div>
                {request.approvedAt && (
                    <p className="text-xs text-slate-400 mt-3">
                        อนุมัติเมื่อ: {format(new Date(request.approvedAt), 'd MMMM yyyy, HH:mm', { locale: th })}
                    </p>
                )}
            </div>

            {/* Items to Pack */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-700">รายการที่ต้องแพค ({request.items.length} รายการ)</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-100">
                        <tr className="text-xs text-slate-500">
                            <th className="text-center py-3 px-4 w-16">แพคแล้ว</th>
                            <th className="text-left py-3 px-4">สินค้า</th>
                            <th className="text-center py-3 px-4 w-24">ไซส์</th>
                            <th className="text-center py-3 px-4 w-24">จำนวน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((item) => (
                            <tr
                                key={item.id}
                                className={`border-b border-slate-100 transition-colors ${packedItems[item.id] ? 'bg-emerald-50' : 'hover:bg-slate-50'
                                    }`}
                            >
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => togglePacked(item.id)}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${packedItems[item.id]
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-slate-300 hover:border-emerald-400'
                                            }`}
                                    >
                                        {packedItems[item.id] && <Check className="h-4 w-4" />}
                                    </button>
                                </td>
                                <td className="py-3 px-4">
                                    <p className={`font-medium ${packedItems[item.id] ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                        {item.product.name}
                                    </p>
                                    <p className="text-xs text-slate-400">{item.product.code || item.barcode}</p>
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600">
                                    {item.product.size || '-'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className={`font-bold ${packedItems[item.id] ? 'text-emerald-600' : 'text-slate-900'}`}>
                                        {item.quantity}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="text-sm text-slate-500">
                    แพคแล้ว {Object.values(packedItems).filter(Boolean).length} / {request.items.length} รายการ
                </div>
                <button
                    onClick={handleMarkPacked}
                    disabled={!allPacked || isProcessing}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${allPacked && !isProcessing
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    <Truck className="h-5 w-5" />
                    {isProcessing ? 'กำลังประมวลผล...' : 'แพคเสร็จ - พร้อมส่ง'}
                </button>
            </div>
        </div>
    );
}
