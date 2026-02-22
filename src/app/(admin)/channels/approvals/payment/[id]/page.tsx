import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Receipt, Users, DollarSign, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventExpenses } from "@/app/(dashboard)/channels/[id]/EventExpenses";
import { EventCompensation } from "@/app/(dashboard)/channels/[id]/EventCompensation";
import { PaymentApprovalActions } from "./PaymentApprovalActions";

async function getChannelForReview(id: string) {
    const [channel, salesAgg] = await Promise.all([
        db.salesChannel.findUnique({
            where: { id },
            include: {
                staff: { include: { staff: true } },
                expenses: { orderBy: { createdAt: 'desc' } },
            },
        }),
        db.sale.aggregate({
            where: { channelId: id, status: 'active' },
            _sum: { totalAmount: true },
        }),
    ]);

    if (!channel) return null;
    return { ...channel, totalSalesAmount: Number(salesAgg._sum.totalAmount || 0) };
}

export default async function PaymentReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const channel = await getChannelForReview(id);

    if (!channel) notFound();

    const totalExpenses = channel.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const isPending = channel.status === 'pending_payment';
    const isApproved = channel.status === 'payment_approved';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/channels/approvals/payment"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">ตรวจสอบ & อนุมัติจ่าย</h1>
                        {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
                                <Clock className="h-3 w-3" />
                                รออนุมัติ
                            </span>
                        )}
                        {isApproved && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                อนุมัติแล้ว
                            </span>
                        )}
                    </div>
                    <div className="text-slate-600 font-medium">{channel.name}</div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {channel.location}
                        </span>
                        <span>•</span>
                        <span>
                            {format(new Date(channel.startDate!), "d MMM yyyy")} - {format(new Date(channel.endDate!), "d MMM yyyy")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">ยอดขายรวม</div>
                    <div className="text-lg font-bold text-emerald-600">฿{channel.totalSalesAmount.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">ค่าใช้จ่ายรวม</div>
                    <div className="text-lg font-bold text-red-600">฿{totalExpenses.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">พนักงาน</div>
                    <div className="text-lg font-bold text-slate-900">{channel.staff.length} คน</div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Expenses (read-only) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Receipt className="h-5 w-5 text-slate-500" />
                        รายการค่าใช้จ่าย
                    </div>
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
                        readonly={true}
                    />
                </div>

                {/* Right: Compensation (read-only view via EventCompensation) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Users className="h-5 w-5 text-slate-500" />
                        สรุปค่าตอบแทนทีมงาน
                    </div>
                    <EventCompensation channelId={channel.id} readonly={isPending || isApproved} />
                </div>
            </div>

            {/* Action Buttons */}
            <PaymentApprovalActions channelId={channel.id} status={channel.status} />
        </div>
    );
}
