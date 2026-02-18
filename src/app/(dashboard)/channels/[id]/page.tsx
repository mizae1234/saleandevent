import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Calendar, MapPin, Users, Package, Clock, Pencil, Receipt, Truck, Hash, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventActions from "./EventActions";
import { EventExpenses } from "./EventExpenses";
import { EventCompensation } from "./EventCompensation";

async function getChannelDetails(id: string) {
    return db.salesChannel.findUnique({
        where: { id },
        include: {
            staff: { include: { staff: true } },
            stockRequests: {
                include: {
                    allocations: { include: { product: true } },
                    shipment: true,
                    receiving: true,
                },
                orderBy: { createdAt: 'desc' },
            },
            stock: { include: { product: true }, orderBy: { quantity: 'desc' } },
            expenses: { orderBy: { createdAt: 'desc' } },
            sales: { where: { status: 'active' } },
        },
    });
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-700' },
    submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
    active: { label: 'กำลังขาย', color: 'bg-emerald-100 text-emerald-700' },
    pending_return: { label: 'รอส่งคืน', color: 'bg-orange-100 text-orange-700' },
    returning: { label: 'กำลังส่งคืน', color: 'bg-purple-100 text-purple-700' },
    returned: { label: 'รับคืนแล้ว', color: 'bg-teal-100 text-teal-700' },
    completed: { label: 'ปิดงาน', color: 'bg-slate-200 text-slate-600' },
};

const requestStatusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-600' },
    submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
    allocated: { label: 'จัดสรรแล้ว', color: 'bg-indigo-100 text-indigo-700' },
    packed: { label: 'แพ็คแล้ว', color: 'bg-purple-100 text-purple-700' },
    shipped: { label: 'จัดส่งแล้ว', color: 'bg-cyan-100 text-cyan-700' },
    received: { label: 'รับแล้ว', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-600' },
};

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const channel = await getChannelDetails(id);

    if (!channel) notFound();

    const totalSales = channel.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalStock = channel.stock.reduce((sum, s) => sum + s.quantity, 0);
    const totalSold = channel.stock.reduce((sum, s) => sum + s.soldQuantity, 0);
    const totalExpenses = channel.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const status = statusConfig[channel.status] || { label: channel.status, color: 'bg-slate-100 text-slate-700' };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <Link href="/channels" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-slate-900">{channel.name}</h1>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                                {status.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> {channel.code}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {channel.location}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-medium">{channel.type}</span>
                        </div>
                    </div>
                    {['draft', 'submitted'].includes(channel.status) && (
                        <Link href={`/channels/${channel.id}/edit`} className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                            <Pencil className="h-4 w-4" /> แก้ไข
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {channel.type === 'EVENT' && channel.startDate && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <Calendar className="h-3.5 w-3.5" /> วันที่
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {format(channel.startDate, 'd MMM', { locale: th })} - {channel.endDate ? format(channel.endDate, 'd MMM yy', { locale: th }) : '-'}
                        </p>
                    </div>
                )}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                        <Package className="h-3.5 w-3.5" /> สต็อก
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{totalStock.toLocaleString()} ชิ้น</p>
                    <p className="text-xs text-slate-400">ขายแล้ว {totalSold.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1">
                        <Target className="h-3.5 w-3.5" /> ยอดขาย
                    </div>
                    <p className="text-sm font-semibold text-emerald-700">฿{totalSales.toLocaleString()}</p>
                    {channel.salesTarget && (
                        <p className="text-xs text-slate-400">เป้า ฿{Number(channel.salesTarget).toLocaleString()}</p>
                    )}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
                        <Receipt className="h-3.5 w-3.5" /> ค่าใช้จ่าย
                    </div>
                    <p className="text-sm font-semibold text-red-700">฿{totalExpenses.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stock Requests Section */}
                    <div className="bg-white border border-slate-200 rounded-xl">
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                                <Package className="h-4 w-4 text-indigo-500" /> คำขอสินค้า
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {channel.stockRequests.length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-400">ยังไม่มีคำขอสินค้า</div>
                            ) : (
                                channel.stockRequests.map(req => {
                                    const reqStatus = requestStatusConfig[req.status] || { label: req.status, color: 'bg-slate-100 text-slate-600' };
                                    const allocatedTotal = req.allocations.reduce((s, a) => s + a.packedQuantity, 0);
                                    return (
                                        <div key={req.id} className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                                    </span>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reqStatus.color}`}>
                                                        {reqStatus.label}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-slate-400">ขอ</p>
                                                    <p className="font-semibold text-slate-900">{req.requestedTotalQuantity.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">จัดสรร</p>
                                                    <p className="font-semibold text-slate-900">{allocatedTotal > 0 ? allocatedTotal.toLocaleString() : '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">รับแล้ว</p>
                                                    <p className="font-semibold text-slate-900">{req.receiving ? req.receiving.receivedTotalQty.toLocaleString() : '-'}</p>
                                                </div>
                                            </div>
                                            {req.shipment && (
                                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                    <Truck className="h-3.5 w-3.5" />
                                                    {req.shipment.provider} · {req.shipment.trackingNumber}
                                                </div>
                                            )}
                                            {req.notes && (
                                                <p className="mt-2 text-xs text-slate-500 italic">📝 {req.notes}</p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Current Stock */}
                    {channel.stock.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl">
                            <div className="p-4 border-b border-slate-100">
                                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-emerald-500" /> สต็อกปัจจุบัน ({channel.stock.length} รายการ)
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="text-left p-3 text-xs font-medium text-slate-500">สินค้า</th>
                                            <th className="text-right p-3 text-xs font-medium text-slate-500">คงเหลือ</th>
                                            <th className="text-right p-3 text-xs font-medium text-slate-500">ขายแล้ว</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {channel.stock.slice(0, 20).map(s => (
                                            <tr key={s.id}>
                                                <td className="p-3">
                                                    <p className="font-medium text-slate-900">{s.product.name}</p>
                                                    <p className="text-xs text-slate-400">{s.barcode} {s.product.size && `· ${s.product.size}`} {s.product.color && `· ${s.product.color}`}</p>
                                                </td>
                                                <td className="p-3 text-right font-medium">{(s.quantity - s.soldQuantity).toLocaleString()}</td>
                                                <td className="p-3 text-right text-emerald-600">{s.soldQuantity.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {channel.stock.length > 20 && (
                                    <div className="p-3 text-center text-xs text-slate-400">... แสดง 20 จาก {channel.stock.length} รายการ</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Expenses */}
                    <EventExpenses
                        channelId={channel.id}
                        expenses={channel.expenses.map(e => ({
                            id: e.id,
                            category: e.category,
                            amount: Number(e.amount),
                            description: e.description || '',
                            status: e.status,
                            createdAt: e.createdAt.toISOString(),
                        }))}
                        readonly={['completed', 'cancelled'].includes(channel.status)}
                    />
                </div>

                {/* Sidebar (Right 1/3) */}
                <div className="space-y-4">
                    {/* Actions */}
                    <EventActions channel={{
                        id: channel.id,
                        type: channel.type,
                        status: channel.status,
                        name: channel.name,
                    }} />

                    {/* Staff */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-blue-500" /> พนักงาน ({channel.staff.length})
                        </h3>
                        <div className="space-y-2">
                            {channel.staff.map(cs => (
                                <div key={cs.id} className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {cs.staff.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{cs.staff.name}</p>
                                    </div>
                                    {cs.isMain && (
                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">หัวหน้า</span>
                                    )}
                                </div>
                            ))}
                            {channel.staff.length === 0 && (
                                <p className="text-sm text-slate-400">ยังไม่มีพนักงาน</p>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
                        {channel.responsiblePersonName && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">ผู้รับผิดชอบ</span>
                                <span className="text-slate-900 font-medium">{channel.responsiblePersonName}</span>
                            </div>
                        )}
                        {channel.phone && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">เบอร์โทร</span>
                                <span className="text-slate-900">{channel.phone}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-slate-500">สร้างเมื่อ</span>
                            <span className="text-slate-900">{format(channel.createdAt, 'd MMM yy HH:mm', { locale: th })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
