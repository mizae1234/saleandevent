import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, Calendar, MapPin, Package, Clock, Pencil, Receipt, Truck, Hash, Target } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventActions from "./EventActions";
import { EventExpenses } from "./EventExpenses";
import { EventCompensation } from "./EventCompensation";
import { EventStockTabs } from "./EventStockTabs";
import { InvoiceDownloadButton } from "./InvoiceDownloadButton";
import { StaffManager } from "./StaffManager";
import ChannelBasicInfoEditor from "./ChannelBasicInfoEditor";

async function getChannelDetails(id: string) {
    const [channel, salesAgg, expenseCategories] = await Promise.all([
        db.salesChannel.findUnique({
            where: { id },
            include: {
                staff: {
                    select: {
                        id: true,
                        isMain: true,
                        staff: { select: { id: true, name: true } },
                    },
                },
                customer: { select: { id: true, code: true, name: true } },
                stockRequests: {
                    include: {
                        allocations: { select: { packedQuantity: true } },
                        shipment: { select: { provider: true, trackingNumber: true } },
                        receiving: { select: { receivedTotalQty: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
                stock: {
                    include: {
                        product: {
                            select: { name: true, code: true, size: true, color: true, producttype: true }
                        }
                    },
                    orderBy: { quantity: 'desc' },
                },
                expenses: { orderBy: { createdAt: 'desc' } },
            },
        }),
        db.sale.aggregate({
            where: { channelId: id, status: 'active' },
            _sum: { totalAmount: true },
        }),
        db.expenseCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { name: true },
        }),
    ]);

    if (!channel) return null;
    return { ...channel, totalSalesAmount: Number(salesAgg._sum.totalAmount || 0), expenseCategories: expenseCategories.map(c => c.name) };
}

const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'แบบร่าง', color: 'bg-slate-100 text-slate-700' },
    submitted: { label: 'รออนุมัติ', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700' },
    active: { label: 'กำลังขาย', color: 'bg-emerald-100 text-emerald-700' },
    pending_return: { label: 'รอส่งคืน', color: 'bg-orange-100 text-orange-700' },
    returning: { label: 'กำลังส่งคืน', color: 'bg-purple-100 text-purple-700' },
    returned: { label: 'รับคืนแล้ว', color: 'bg-teal-100 text-teal-700' },
    pending_payment: { label: 'รออนุมัติจ่าย', color: 'bg-amber-100 text-amber-700' },
    payment_approved: { label: 'อนุมัติจ่ายแล้ว', color: 'bg-emerald-100 text-emerald-700' },
    completed: { label: 'ปิดงาน', color: 'bg-slate-200 text-slate-600' },
};



export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const channel = await getChannelDetails(id);

    if (!channel) notFound();

    const totalSales = channel.totalSalesAmount;
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
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 text-xs font-medium">{channel.type}</span>
                        </div>
                    </div>
                    {['draft', 'submitted'].includes(channel.status) && (
                        <Link href={`/channels/${channel.id}/edit`} className="flex items-center gap-1 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
                            <Pencil className="h-4 w-4" /> แก้ไข
                        </Link>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {channel.type === 'EVENT' && channel.startDate && (
                    <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <Calendar className="h-3.5 w-3.5" /> วันที่
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {format(channel.startDate, 'd MMM', { locale: th })} - {channel.endDate ? format(channel.endDate, 'd MMM yy', { locale: th }) : '-'}
                        </p>
                    </div>
                )}
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
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
                    {/* Stock & Requests Tabs */}
                    <EventStockTabs
                        channelName={channel.name}
                        channelCode={channel.code}
                        stock={channel.stock.map(s => ({
                            id: s.id,
                            barcode: s.barcode,
                            quantity: s.quantity,
                            soldQuantity: s.soldQuantity,
                            product: {
                                name: s.product.name,
                                code: s.product.code,
                                size: s.product.size,
                                color: s.product.color,
                                producttype: s.product.producttype,
                            }
                        }))}
                        stockRequests={channel.stockRequests.map(req => ({
                            id: req.id,
                            requestType: req.requestType,
                            status: req.status,
                            requestedTotalQuantity: req.requestedTotalQuantity,
                            notes: req.notes,
                            createdAt: req.createdAt.toISOString(),
                            allocatedTotal: req.allocations.reduce((s, a) => s + a.packedQuantity, 0),
                            receivedTotal: req.receiving ? req.receiving.receivedTotalQty.toLocaleString() : null,
                            shipment: req.shipment ? { provider: req.shipment.provider, trackingNumber: req.shipment.trackingNumber } : null,
                        }))}
                    />

                    {/* Expenses */}
                    <EventExpenses
                        channelId={channel.id}
                        categories={channel.expenseCategories}
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

                    {/* Invoice Download */}
                    {channel.stockRequests.some(r => ['shipped', 'received'].includes(r.status)) && (
                        <InvoiceDownloadButton
                            channelId={channel.id}
                            channelName={channel.name}
                        />
                    )}

                    {/* Staff Manager */}
                    <StaffManager channelId={channel.id} staff={channel.staff} />

                    {/* Info (Editable) */}
                    <ChannelBasicInfoEditor
                        channelId={channel.id}
                        name={channel.name}
                        location={channel.location}
                        responsiblePersonName={channel.responsiblePersonName}
                        phone={channel.phone}
                        startDate={channel.startDate ? format(channel.startDate, 'yyyy-MM-dd') : null}
                        endDate={channel.endDate ? format(channel.endDate, 'yyyy-MM-dd') : null}
                        salesTarget={channel.salesTarget ? Number(channel.salesTarget) : null}
                        customerId={channel.customerId}
                    />
                    <div className="bg-white rounded-xl p-4 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
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
