import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User2, Banknote, Receipt, CheckCircle2, Clock, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import StaffPayrollEditor from "./StaffPayrollEditor";

export default async function StaffPayrollDetailPage({
    params,
}: {
    params: Promise<{ id: string; staffId: string }>;
}) {
    const { id: channelId, staffId } = await params;

    const [channel, staffRecord, assignment, expenses, attendanceDays] = await Promise.all([
        db.salesChannel.findUnique({
            where: { id: channelId },
            select: { id: true, name: true, code: true, startDate: true, endDate: true },
        }),
        db.staff.findUnique({
            where: { id: staffId },
            select: {
                id: true, code: true, name: true, phone: true,
                bankName: true, bankAccountNo: true,
                dailyRate: true, commissionAmount: true, paymentType: true,
            },
        }),
        db.channelStaff.findFirst({
            where: { channelId, staffId },
        }),
        db.channelExpense.findMany({
            where: { channelId, createdBy: staffId },
            orderBy: { createdAt: 'desc' },
        }),
        db.attendance.count({
            where: { channelId, staffId },
        }),
    ]);

    if (!channel || !staffRecord || !assignment) notFound();

    const dailyRate = Number(staffRecord.dailyRate || 0);
    const daysWorked = assignment.daysWorkedOverride ?? attendanceDays;
    const commission = Number(assignment.commissionOverride ?? staffRecord.commissionAmount ?? 0);
    const totalWage = dailyRate * daysWorked;
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const grandTotal = totalWage + commission + totalExpense;

    const expenseData = expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description,
        createdAt: e.createdAt.toISOString(),
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={`/hr/payroll/${channelId}`}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3"
                >
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <User2 className="h-6 w-6 text-blue-600" />
                    {staffRecord.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {staffRecord.code} — {channel.name} ({channel.code})
                </p>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
                {assignment.isSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <FileCheck className="h-3.5 w-3.5" />
                        ส่งเบิกแล้ว
                        {assignment.submittedAt && (
                            <span className="text-emerald-500 ml-1">
                                {format(assignment.submittedAt, 'd MMM yy HH:mm', { locale: th })}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5" /> ยังไม่ส่งเบิก
                    </span>
                )}
                {assignment.isWagePaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        โอนค่าแรงแล้ว
                        {assignment.wagePaidAt && (
                            <span className="text-emerald-500 ml-1">
                                {format(assignment.wagePaidAt, 'd MMM yy HH:mm', { locale: th })}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5" /> ยังไม่โอนค่าแรง
                    </span>
                )}
                {assignment.isCommissionPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        โอนคอมแล้ว
                        {assignment.commissionPaidAt && (
                            <span className="text-purple-500 ml-1">
                                {format(assignment.commissionPaidAt, 'd MMM yy HH:mm', { locale: th })}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5" /> ยังไม่โอนคอม
                    </span>
                )}
            </div>

            {/* Staff Info & Bank */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <User2 className="h-4 w-4 text-slate-400" /> ข้อมูลพนักงาน
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">รหัส</span>
                            <span className="font-mono text-slate-800">{staffRecord.code || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">เบอร์โทร</span>
                            <span className="text-slate-800">{staffRecord.phone || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">บทบาท</span>
                            <span className="text-slate-800">{assignment.role || 'PC'}{assignment.isMain ? ' (หัวหน้า)' : ''}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-slate-400" /> ข้อมูลธนาคาร
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">ธนาคาร</span>
                            <span className="text-slate-800">{staffRecord.bankName || 'ยังไม่ระบุ'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">เลขบัญชี</span>
                            <span className="font-mono text-lg text-slate-900 tracking-wider">{staffRecord.bankAccountNo || 'ยังไม่ระบุ'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editable Section */}
            <StaffPayrollEditor
                channelId={channelId}
                staffId={staffId}
                wage={{
                    dailyRate,
                    daysWorked,
                    commission,
                    totalWage,
                }}
                expenses={expenseData}
                totalExpense={totalExpense}
                grandTotal={grandTotal}
            />
        </div>
    );
}
