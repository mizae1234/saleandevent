import { db } from "@/lib/db";
import { ArrowLeft, Package, MapPin, Truck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReturnShippingForm } from "./ReturnShippingForm";

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

async function getEventForReturnShipping(id: string) {
    const event = await db.salesChannel.findUnique({
        where: { id },
        include: {
            returnSummaries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    barcode: true,
                                    name: true,
                                    code: true,
                                    size: true,
                                    color: true,
                                    producttype: true,
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    return event;
}

interface Props {
    params: Promise<{ id: string }>;
}

interface GroupedRow {
    no: number;
    producttype: string;
    code: string;
    color: string;
    sizes: Record<string, { barcode: string; qty: number }>;
    total: number;
}

export default async function ReturnShippingPage({ params }: Props) {
    const { id } = await params;
    const event = await getEventForReturnShipping(id);

    if (!event) {
        notFound();
    }

    // Only pending_return events can ship
    if (event.status !== 'pending_return') {
        redirect(`/pc/close`);
    }

    const returnSummary = event.returnSummaries[0];
    if (!returnSummary) {
        redirect(`/pc/close/${id}`);
    }

    const returnItems = returnSummary.items.filter(item => item.remainingQuantity > 0);
    const totalReturn = returnItems.reduce((sum, item) => sum + item.remainingQuantity, 0);

    // Group items by code + color (same as receiving page)
    const groupedRows: GroupedRow[] = (() => {
        const map = new Map<string, GroupedRow>();
        let counter = 0;

        for (const item of returnItems) {
            const key = `${item.product.code || item.barcode}__${item.product.color || ''}`;
            let row = map.get(key);
            if (!row) {
                counter++;
                row = {
                    no: counter,
                    producttype: item.product.producttype || item.product.name || '',
                    code: item.product.code || item.barcode,
                    color: item.product.color || '-',
                    sizes: {},
                    total: 0,
                };
                map.set(key, row);
            }
            const size = item.product.size;
            if (size) {
                if (row.sizes[size]) {
                    row.sizes[size].qty += item.remainingQuantity;
                } else {
                    row.sizes[size] = { barcode: item.barcode, qty: item.remainingQuantity };
                }
            }
            row.total += item.remainingQuantity;
        }

        return Array.from(map.values());
    })();

    // Size totals
    const sizeTotals: Record<string, number> = {};
    for (const s of SIZES) {
        sizeTotals[s] = groupedRows.reduce((sum, r) => sum + (r.sizes[s]?.qty || 0), 0);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/pc/close/${id}`}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">จัดส่งสินค้าคืน</h1>
                    <p className="text-slate-500">{event.name} ({event.code})</p>
                </div>
            </div>

            {/* Event Summary */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">ข้อมูลการส่งคืน</h3>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                            <MapPin className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ส่งจาก</p>
                            <p className="font-medium text-slate-900">{event.location}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                            <Package className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">จำนวนส่งคืน</p>
                            <p className="font-medium text-slate-900">{totalReturn} ชิ้น ({groupedRows.length} รุ่น)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <Truck className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ส่งไปยัง</p>
                            <p className="font-medium text-slate-900">คลังสินค้า</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table - Grouped like Receiving page */}
            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-indigo-50">
                    <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        รายการสินค้าที่ส่งคืน
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-10">#</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">ประเภท</th>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">รุ่น</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">สี</th>
                                {SIZES.map(s => (
                                    <th key={s} className="text-center p-3 text-xs font-semibold text-slate-600 w-14">{s}</th>
                                ))}
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-16">รวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedRows.map(row => (
                                <tr key={`${row.code}-${row.color}`} className="hover:bg-slate-50">
                                    <td className="p-3 text-center text-slate-400">{row.no}</td>
                                    <td className="p-3 text-slate-700">{row.producttype}</td>
                                    <td className="p-3 font-semibold text-indigo-700">{row.code}</td>
                                    <td className="p-3 text-center text-slate-700">{row.color}</td>
                                    {SIZES.map(s => (
                                        <td key={s} className="p-3 text-center">
                                            {row.sizes[s] ? (
                                                <span className="font-medium text-slate-900">{row.sizes[s].qty}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-3 text-center font-bold text-slate-900">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                            <tr>
                                <td colSpan={4} className="p-3 text-sm font-bold text-slate-700">รวมทั้งหมด</td>
                                {SIZES.map(s => (
                                    <td key={s} className="p-3 text-center font-bold text-slate-700">
                                        {sizeTotals[s] > 0 ? sizeTotals[s] : '-'}
                                    </td>
                                ))}
                                <td className="p-3 text-center font-bold text-indigo-700 text-base">{totalReturn}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Shipping Form */}
            <ReturnShippingForm channelId={event.id} />
        </div>
    );
}
