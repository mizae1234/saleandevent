import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Package, CheckCircle2, AlertTriangle, Truck } from "lucide-react";
import Link from "next/link";

export default async function ReceiveHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const receiving = await db.receiving.findUnique({
        where: { id },
        include: {
            request: {
                include: {
                    channel: { select: { id: true, name: true, code: true, location: true } },
                    shipment: { select: { provider: true, trackingNumber: true, shippedAt: true } },
                },
            },
            items: {
                include: {
                    product: {
                        select: { name: true, code: true, size: true, color: true, producttype: true },
                    },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    });

    if (!receiving) notFound();

    const { request } = receiving;
    const totalAllocated = receiving.items.reduce((s, i) => s + i.allocatedQty, 0);
    const totalReceived = receiving.items.reduce((s, i) => s + i.receivedQty, 0);
    const totalDiff = totalAllocated - totalReceived;
    const hasDifference = totalDiff !== 0;

    // Group items by code + color
    const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    interface GroupedRow {
        no: number;
        producttype: string;
        code: string;
        color: string;
        sizes: Record<string, { allocated: number; received: number }>;
        totalAllocated: number;
        totalReceived: number;
    }

    const groupedRows: GroupedRow[] = [];
    const rowMap = new Map<string, GroupedRow>();
    let counter = 0;

    for (const item of receiving.items) {
        const key = `${item.product.code || item.barcode}__${item.product.color || ''}`;
        let row = rowMap.get(key);
        if (!row) {
            counter++;
            row = {
                no: counter,
                producttype: item.product.producttype || item.product.name || '',
                code: item.product.code || item.barcode,
                color: item.product.color || '-',
                sizes: {},
                totalAllocated: 0,
                totalReceived: 0,
            };
            rowMap.set(key, row);
            groupedRows.push(row);
        }
        const size = item.product.size || '-';
        if (!row.sizes[size]) {
            row.sizes[size] = { allocated: 0, received: 0 };
        }
        row.sizes[size].allocated += item.allocatedQty;
        row.sizes[size].received += item.receivedQty;
        row.totalAllocated += item.allocatedQty;
        row.totalReceived += item.receivedQty;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/pc/receive"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-900">ประวัติการรับสินค้า</h1>
                    <p className="text-sm text-slate-500">{request.channel.name} — {request.channel.code}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    รับแล้ว
                </span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">จัดส่ง</p>
                    <p className="text-xl font-bold text-slate-700">{totalAllocated} <span className="text-sm font-normal text-slate-400">ชิ้น</span></p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
                    <p className="text-xs text-emerald-600 mb-1">รับจริง</p>
                    <p className="text-xl font-bold text-emerald-700">{totalReceived} <span className="text-sm font-normal text-emerald-400">ชิ้น</span></p>
                </div>
                <div className={`bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 ${hasDifference ? 'bg-gradient-to-r from-amber-50 to-white' : ''}`}>
                    <p className="text-xs text-slate-400 mb-1">ส่วนต่าง</p>
                    <p className={`text-xl font-bold ${hasDifference ? 'text-amber-600' : 'text-slate-400'}`}>
                        {hasDifference ? totalDiff : '-'}
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500">ประเภท</span>
                    <span className="font-medium text-slate-900">{request.requestType === 'TOPUP' ? 'เบิกเพิ่ม (Top-Up)' : 'เริ่มต้น (Initial)'}</span>
                </div>
                {request.shipment && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">ขนส่ง</span>
                        <span className="font-medium text-slate-900 flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-slate-400" />
                            {request.shipment.provider} {request.shipment.trackingNumber && `· ${request.shipment.trackingNumber}`}
                        </span>
                    </div>
                )}
                {receiving.receivedAt && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">รับเมื่อ</span>
                        <span className="font-medium text-slate-900">{format(receiving.receivedAt, 'd MMM yyyy HH:mm น.', { locale: th })}</span>
                    </div>
                )}
                {receiving.notes && (
                    <div className="flex justify-between">
                        <span className="text-slate-500">หมายเหตุ</span>
                        <span className="text-slate-700">{receiving.notes}</span>
                    </div>
                )}
            </div>

            {/* Detail Table */}
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">รายการสินค้า ({receiving.items.length} รายการ)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="text-center p-3 text-xs font-semibold text-slate-500 w-10">#</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-500">ประเภท</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-500">รุ่น</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-500">สี</th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center p-3 text-xs font-semibold text-slate-500 w-16">{s}</th>
                                ))}
                                <th className="text-center p-3 text-xs font-semibold text-slate-500 w-16">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedRows.map(row => (
                                <tr key={`${row.code}-${row.color}`} className="hover:bg-slate-50/50">
                                    <td className="p-3 text-center text-slate-400">{row.no}</td>
                                    <td className="p-3 text-slate-700">{row.producttype}</td>
                                    <td className="p-3 font-semibold text-indigo-700">{row.code}</td>
                                    <td className="p-3 text-center text-slate-700">{row.color}</td>
                                    {SIZES.map(s => {
                                        const data = row.sizes[s];
                                        if (!data) return <td key={s} className="p-3 text-center text-slate-300">-</td>;
                                        const diff = data.allocated - data.received;
                                        return (
                                            <td key={s} className="p-3 text-center">
                                                <span className="font-medium text-slate-900">{data.received}</span>
                                                {diff !== 0 && (
                                                    <span className="text-[10px] text-amber-600 block">/{data.allocated}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 text-center">
                                        <span className="font-bold text-slate-900">{row.totalReceived}</span>
                                        {row.totalAllocated !== row.totalReceived && (
                                            <span className="text-[10px] text-amber-600 block">/{row.totalAllocated}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                                {SIZES.map(s => {
                                    const sizeTotal = groupedRows.reduce((sum, r) => sum + (r.sizes[s]?.received || 0), 0);
                                    return (
                                        <td key={s} className="p-3 text-center font-bold text-slate-700">
                                            {sizeTotal > 0 ? sizeTotal : '-'}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-center font-bold text-emerald-700 text-base">{totalReceived}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Difference Warning */}
            {hasDifference && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">มีส่วนต่างจากจำนวนที่จัดส่ง</p>
                        <p className="text-xs text-amber-600">จัดส่ง {totalAllocated} ชิ้น · รับจริง {totalReceived} ชิ้น · ส่วนต่าง {totalDiff} ชิ้น</p>
                    </div>
                </div>
            )}
        </div>
    );
}
