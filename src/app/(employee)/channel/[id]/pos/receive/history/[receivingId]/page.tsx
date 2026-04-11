import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, AlertTriangle, Truck } from "lucide-react";
import Link from "next/link";

export default async function EmployeeReceiveHistoryPage({ params }: { params: Promise<{ id: string; receivingId: string }> }) {
    const { id: channelId, receivingId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const receiving = await db.receiving.findUnique({
        where: { id: receivingId },
        include: {
            request: {
                include: {
                    channel: { select: { id: true, name: true, code: true } },
                    shipment: { select: { provider: true, trackingNumber: true } },
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

    if (!receiving || receiving.request.channelId !== channelId) notFound();

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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}/pos/receive`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-base font-bold text-slate-900">ประวัติการรับสินค้า</h1>
                    <p className="text-xs text-slate-400">{receiving.request.channel.name}</p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> รับแล้ว
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400">จัดส่ง</p>
                    <p className="text-lg font-bold text-slate-700">{totalAllocated}</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <p className="text-[10px] text-emerald-600">รับจริง</p>
                    <p className="text-lg font-bold text-emerald-700">{totalReceived}</p>
                </div>
                <div className={`rounded-xl p-3 shadow-sm border border-slate-100 ${hasDifference ? 'bg-gradient-to-r from-amber-50 to-white' : 'bg-white'}`}>
                    <p className="text-[10px] text-slate-400">ส่วนต่าง</p>
                    <p className={`text-lg font-bold ${hasDifference ? 'text-amber-600' : 'text-slate-300'}`}>
                        {hasDifference ? totalDiff : '-'}
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between">
                    <span className="text-slate-400">ประเภท</span>
                    <span className="font-medium text-slate-700">{receiving.request.requestType === 'TOPUP' ? 'ของเพิ่ม' : 'เริ่มต้น'}</span>
                </div>
                {receiving.request.shipment && (
                    <div className="flex justify-between">
                        <span className="text-slate-400">ขนส่ง</span>
                        <span className="font-medium text-slate-700 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {receiving.request.shipment.provider} {receiving.request.shipment.trackingNumber && `· ${receiving.request.shipment.trackingNumber}`}
                        </span>
                    </div>
                )}
                {receiving.receivedAt && (
                    <div className="flex justify-between">
                        <span className="text-slate-400">รับเมื่อ</span>
                        <span className="font-medium text-slate-700">{format(receiving.receivedAt, 'd MMM yy HH:mm น.', { locale: th })}</span>
                    </div>
                )}
            </div>

            {/* Detail Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-600">รายการสินค้า ({receiving.items.length} รายการ)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="text-center p-2 font-semibold text-slate-500 w-8">#</th>
                                <th className="text-left p-2 font-semibold text-slate-500">รุ่น</th>
                                <th className="text-center p-2 font-semibold text-slate-500">สี</th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center p-2 font-semibold text-slate-500 w-12">{s}</th>
                                ))}
                                <th className="text-center p-2 font-semibold text-slate-500 w-14">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {groupedRows.map(row => (
                                <tr key={`${row.code}-${row.color}`}>
                                    <td className="p-2 text-center text-slate-400">{row.no}</td>
                                    <td className="p-2 font-semibold text-indigo-700">{row.code}</td>
                                    <td className="p-2 text-center text-slate-600">{row.color}</td>
                                    {SIZES.map(s => {
                                        const data = row.sizes[s];
                                        if (!data) return <td key={s} className="p-2 text-center text-slate-300">-</td>;
                                        const diff = data.allocated - data.received;
                                        return (
                                            <td key={s} className="p-2 text-center">
                                                <span className="font-medium text-slate-900">{data.received}</span>
                                                {diff !== 0 && (
                                                    <span className="text-[9px] text-amber-500 block">/{data.allocated}</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 text-center">
                                        <span className="font-bold text-slate-900">{row.totalReceived}</span>
                                        {row.totalAllocated !== row.totalReceived && (
                                            <span className="text-[9px] text-amber-500 block">/{row.totalAllocated}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                            <tr>
                                <td colSpan={3} className="p-2 text-xs font-bold text-slate-600">รวมทั้งหมด</td>
                                {SIZES.map(s => {
                                    const sizeTotal = groupedRows.reduce((sum, r) => sum + (r.sizes[s]?.received || 0), 0);
                                    return (
                                        <td key={s} className="p-2 text-center font-bold text-slate-600">
                                            {sizeTotal > 0 ? sizeTotal : '-'}
                                        </td>
                                    );
                                })}
                                <td className="p-2 text-center font-bold text-emerald-700">{totalReceived}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Difference Warning */}
            {hasDifference && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                        มีส่วนต่าง: จัดส่ง {totalAllocated} · รับจริง {totalReceived} · ต่าง {totalDiff} ชิ้น
                    </p>
                </div>
            )}
        </div>
    );
}
