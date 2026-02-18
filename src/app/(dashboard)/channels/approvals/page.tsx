import { db } from "@/lib/db";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, XCircle, Package, MapPin, Hash, Calendar } from "lucide-react";
import Link from "next/link";
import ApprovalActions from "./ApprovalActions";
import ChannelApprovalActions from "./ChannelApprovalActions";

export default async function ApprovalsPage() {
    const [pendingChannels, pendingRequests] = await Promise.all([
        db.salesChannel.findMany({
            where: { status: 'submitted' },
            include: { staff: { include: { staff: true } } },
            orderBy: { createdAt: 'asc' },
        }),
        db.stockRequest.findMany({
            where: { status: 'submitted' },
            include: { channel: true },
            orderBy: { createdAt: 'asc' },
        }),
    ]);

    const totalPending = pendingChannels.length + pendingRequests.length;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <Link href="/channels" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">รออนุมัติ</h1>
                <p className="text-sm text-slate-500">{totalPending} รายการรออนุมัติ</p>
            </div>

            {totalPending === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-500">ไม่มีรายการรออนุมัติ</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Pending Channels/Events */}
                    {pendingChannels.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-amber-500" /> Event รออนุมัติ ({pendingChannels.length})
                            </h2>
                            <div className="space-y-3">
                                {pendingChannels.map(ch => (
                                    <div key={ch.id} className="bg-white border border-amber-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Link href={`/channels/${ch.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                                                        {ch.name}
                                                    </Link>
                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                                        รออนุมัติ
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                                    <span><Hash className="h-3.5 w-3.5 inline" /> {ch.code}</span>
                                                    <span><MapPin className="h-3.5 w-3.5 inline" /> {ch.location}</span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4 text-sm">
                                                    {ch.startDate && (
                                                        <div>
                                                            <span className="text-xs text-slate-400">วันที่</span>
                                                            <p className="text-slate-700">
                                                                {format(ch.startDate, 'd MMM', { locale: th })} - {ch.endDate ? format(ch.endDate, 'd MMM yy', { locale: th }) : '-'}
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-xs text-slate-400">สร้างเมื่อ</span>
                                                        <p className="text-slate-700">{format(ch.createdAt, 'd MMM yy HH:mm', { locale: th })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChannelApprovalActions channelId={ch.id} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Stock Requests */}
                    {pendingRequests.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Package className="h-4 w-4 text-indigo-500" /> คำขอสินค้ารออนุมัติ ({pendingRequests.length})
                            </h2>
                            <div className="space-y-3">
                                {pendingRequests.map(req => (
                                    <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-slate-900">{req.channel.name}</h3>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.requestType === 'INITIAL' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                        {req.requestType === 'INITIAL' ? 'เริ่มต้น' : 'เพิ่มเติม'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                                    <span><Hash className="h-3.5 w-3.5 inline" /> {req.channel.code}</span>
                                                    <span><MapPin className="h-3.5 w-3.5 inline" /> {req.channel.location}</span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-4">
                                                    <div>
                                                        <span className="text-xs text-slate-400">จำนวนสินค้า</span>
                                                        <p className="text-lg font-bold text-slate-900">{req.requestedTotalQuantity.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชิ้น</span></p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-400">ขอเมื่อ</span>
                                                        <p className="text-sm text-slate-700">{format(req.createdAt, 'd MMM yy HH:mm', { locale: th })}</p>
                                                    </div>
                                                </div>
                                                {req.notes && (
                                                    <p className="mt-2 text-sm text-slate-500 italic">📝 {req.notes}</p>
                                                )}
                                            </div>
                                            <ApprovalActions requestId={req.id} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
