"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";

interface Event {
    id: string;
    name: string;
    code: string;
    location: string;
    status: string;
}

interface Product {
    barcode: string;
    name: string;
    code: string | null;
    size: string | null;
    price: any;
}

interface RequestItem {
    id: string;
    barcode: string;
    quantity: number;
    packedQuantity: number | null;
    receivedQuantity: number | null;
    product: Product;
}

interface StockRequest {
    id: string;
    eventId: string;
    status: string;
    createdAt: Date;
    approvedAt: Date | null;
    approvedBy: string | null;
    shippedAt: Date | null;
    receivedAt: Date | null;
    trackingNo: string | null;
    event: Event;
    items: RequestItem[];
}

interface Props {
    request: StockRequest;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "รออนุมัติ", color: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "อนุมัติแล้ว", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
    packing: { label: "กำลังแพ็ค", color: "bg-purple-100 text-purple-700", icon: Package },
    shipped: { label: "จัดส่งแล้ว", color: "bg-cyan-100 text-cyan-700", icon: Truck },
    received: { label: "รับของแล้ว", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
};

const TIMELINE_STEPS = [
    { key: 'pending', label: 'ขอเบิก' },
    { key: 'approved', label: 'อนุมัติ' },
    { key: 'packing', label: 'แพ็คของ' },
    { key: 'shipped', label: 'จัดส่ง' },
    { key: 'received', label: 'รับของ' },
];

export function RefillDetailClient({ request }: Props) {
    const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const StatusIcon = config.icon;

    // Find current step index
    const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.key === request.status);
    const totalItems = request.items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/pc/refill"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <RefreshCw className="h-6 w-6 text-emerald-600" />
                            รายละเอียดคำขอเบิก
                        </h1>
                        <p className="text-slate-500">
                            #{request.id.slice(0, 8)}
                        </p>
                    </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    {config.label}
                </span>
            </div>

            {/* Event Info Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 mb-2">Event</h3>
                <p className="text-lg font-bold text-slate-900">{request.event.name}</p>
                <p className="text-slate-600 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {request.event.location}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                    ขอเบิกเมื่อ: {format(new Date(request.createdAt), 'd MMMM yyyy, HH:mm น.', { locale: th })}
                </p>
            </div>

            {/* Progress Timeline */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-medium text-slate-500 mb-4">สถานะการดำเนินการ</h3>
                <div className="flex items-center justify-between">
                    {TIMELINE_STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const isPending = index > currentStepIndex;

                        return (
                            <div key={step.key} className="flex flex-col items-center flex-1">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                                            ? 'bg-emerald-500 text-white'
                                            : isCurrent
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-slate-200 text-slate-400'
                                        }`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <span className="text-sm font-medium">{index + 1}</span>
                                    )}
                                </div>
                                <p className={`text-xs mt-2 ${isCurrent ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                                    {step.label}
                                </p>
                                {/* Connector Line */}
                                {index < TIMELINE_STEPS.length - 1 && (
                                    <div
                                        className={`absolute h-0.5 w-full ${index < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                                            }`}
                                        style={{ top: '50%', left: '100%' }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#EFF4FA] text-slate-700">
                            <th className="text-left px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-l-0">สินค้า</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">ไซส์</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">ขอเบิก</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0">แพ็คแล้ว</th>
                            <th className="text-center px-4 py-3 text-sm font-bold border border-slate-200 border-t-0 border-r-0">รับแล้ว</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 border border-slate-200 border-l-0">
                                    <p className="font-medium text-slate-900">{item.product.name}</p>
                                    <p className="text-xs text-slate-400">{item.product.code || item.barcode}</p>
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200 text-slate-600">
                                    {item.product.size || '-'}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200 font-medium text-slate-900">
                                    {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {item.packedQuantity !== null ? (
                                        <span className={item.packedQuantity === item.quantity ? 'text-emerald-600' : 'text-amber-600'}>
                                            {item.packedQuantity}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200 border-r-0">
                                    {item.receivedQuantity !== null ? (
                                        <span className={item.receivedQuantity === item.quantity ? 'text-emerald-600' : 'text-amber-600'}>
                                            {item.receivedQuantity}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-[#EFF4FA] font-bold text-slate-900">
                            <td colSpan={2} className="px-4 py-3 border border-slate-200 border-l-0 text-right">
                                รวมทั้งหมด
                            </td>
                            <td className="px-4 py-3 text-center border border-slate-200">{totalItems}</td>
                            <td className="px-4 py-3 text-center border border-slate-200">
                                {request.items.reduce((sum, i) => sum + (i.packedQuantity || 0), 0) || '-'}
                            </td>
                            <td className="px-4 py-3 text-center border border-slate-200 border-r-0">
                                {request.items.reduce((sum, i) => sum + (i.receivedQuantity || 0), 0) || '-'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Tracking Info */}
            {request.trackingNo && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">
                        <Truck className="h-4 w-4 inline mr-1" />
                        ข้อมูลการจัดส่ง
                    </h3>
                    <p className="text-lg font-bold text-slate-900">
                        เลขพัสดุ: {request.trackingNo}
                    </p>
                    {request.shippedAt && (
                        <p className="text-xs text-slate-400">
                            จัดส่งเมื่อ: {format(new Date(request.shippedAt), 'd MMMM yyyy, HH:mm น.', { locale: th })}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
