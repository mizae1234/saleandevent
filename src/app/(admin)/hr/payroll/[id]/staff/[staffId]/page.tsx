import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User2, Banknote, Receipt, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import StaffPayrollEditor from "./StaffPayrollEditor";
import { WithholdingTaxButton } from "./WithholdingTaxButton";
import {
    getCurrentPeriodMonth,
    isValidPeriodMonth,
    getPeriodMonthDateRange,
    formatPeriodMonthThai,
} from "@/lib/payroll-period";

export default async function StaffPayrollDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string; staffId: string }>;
    searchParams: Promise<{ period?: string }>;
}) {
    const { id: channelId, staffId } = await params;
    const resolvedSearchParams = await searchParams;

    const [channel, staffRecord, assignment, expenseCategories] = await Promise.all([
        db.salesChannel.findUnique({
            where: { id: channelId },
            select: { id: true, type: true, name: true, code: true, startDate: true, endDate: true },
        }),
        db.staff.findUnique({
            where: { id: staffId },
            select: {
                id: true, code: true, name: true, phone: true,
                bankName: true, bankAccountNo: true,
                dailyRate: true, commissionAmount: true, paymentType: true,
                taxId: true, address: true,
            },
        }),
        db.channelStaff.findFirst({
            where: { channelId, staffId },
        }),
        db.expenseCategory.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { name: true, whtType: true },
        }),
    ]);

    if (!channel || !staffRecord || !assignment) notFound();

    const isBranch = channel.type === 'BRANCH';
    const currentMonth = getCurrentPeriodMonth();
    const periodMonth = isBranch
        ? (isValidPeriodMonth(resolvedSearchParams.period) ? resolvedSearchParams.period : currentMonth)
        : null;

    const [periodRecord, expenses, attendanceDays, attachments] = await Promise.all([
        isBranch && periodMonth
            ? db.channelStaffPeriod.findUnique({
                where: {
                    channelStaffId_periodMonth: {
                        channelStaffId: assignment.id,
                        periodMonth,
                    },
                },
            })
            : Promise.resolve(null),
        db.channelExpense.findMany({
            where: {
                channelId,
                createdBy: staffId,
                ...(isBranch && periodMonth
                    ? {
                        OR: [
                            { periodMonth },
                            ...(periodMonth === currentMonth ? [{ periodMonth: null }] : []),
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        }),
        (() => {
            if (isBranch && periodMonth) {
                const { start, end } = getPeriodMonthDateRange(periodMonth);
                return db.attendance.count({
                    where: { channelId, staffId, date: { gte: start, lte: end } },
                });
            }
            return db.attendance.count({
                where: { channelId, staffId },
            });
        })(),
        db.payrollAttachment.findMany({
            where: {
                channelStaff: { channelId, staffId },
                ...(isBranch && periodMonth
                    ? {
                        OR: [
                            { periodMonth },
                            ...(periodMonth === currentMonth ? [{ periodMonth: null }] : []),
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    const paymentType = staffRecord.paymentType || 'daily';
    const isMonthly = paymentType === 'monthly';
    const stateSource = isBranch ? periodRecord : assignment;

    const dailyRate = stateSource?.dailyRateOverride !== null && stateSource?.dailyRateOverride !== undefined
        ? Number(stateSource.dailyRateOverride)
        : Number(staffRecord.dailyRate || 0);
    const daysWorked = isMonthly
        ? (stateSource?.daysWorkedOverride ?? 1)
        : (stateSource?.daysWorkedOverride ?? attendanceDays);
    const commission = Number(stateSource?.commissionOverride ?? staffRecord.commissionAmount ?? 0);
    const totalWage = dailyRate * daysWorked;

    const categoryWhtMap = new Map(expenseCategories.map(c => [c.name, c.whtType]));
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const grandTotal = totalWage + commission + totalExpense;

    const expenseData = expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: Number(e.amount),
        description: e.description,
        whtType: categoryWhtMap.get(e.category) || null,
        createdAt: e.createdAt.toISOString(),
    }));

    const backHref = periodMonth
        ? `/hr/payroll/${channelId}?period=${periodMonth}`
        : `/hr/payroll/${channelId}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href={backHref}
                    className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3"
                >
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <User2 className="h-6 w-6 text-blue-600" />
                        {staffRecord.name}
                    </h1>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        isMonthly ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                        {isMonthly ? 'พนักงานรายเดือน' : 'พนักงานรายวัน'}
                    </span>
                </div>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{staffRecord.code} — {channel.name} ({channel.code})</span>
                    {periodMonth && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                            <CalendarDays className="h-3.5 w-3.5" />
                            งวด {formatPeriodMonthThai(periodMonth)} (รอบจ่ายวันที่ 30)
                        </span>
                    )}
                </p>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
                {stateSource?.isSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ส่งเบิกแล้ว ({stateSource.submittedAt ? format(stateSource.submittedAt, 'd MMM yyyy HH:mm', { locale: th }) : '-'})
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <Clock className="h-3.5 w-3.5" /> ยังไม่ส่งเบิก
                    </span>
                )}

                {stateSource?.isWagePaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <Banknote className="h-3.5 w-3.5" /> {isMonthly ? 'โอนเงินเดือนแล้ว' : 'โอนค่าแรงแล้ว'} ({stateSource.wagePaidAt ? format(stateSource.wagePaidAt, 'd MMM yyyy HH:mm', { locale: th }) : '-'})
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <Banknote className="h-3.5 w-3.5" /> {isMonthly ? 'ยังไม่โอนเงินเดือน' : 'ยังไม่โอนค่าแรง'}
                    </span>
                )}

                {stateSource?.isCommissionPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <Receipt className="h-3.5 w-3.5" /> โอนคอมแล้ว ({stateSource.commissionPaidAt ? format(stateSource.commissionPaidAt, 'd MMM yyyy HH:mm', { locale: th }) : '-'})
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <Receipt className="h-3.5 w-3.5" /> ยังไม่โอนคอม
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
                periodMonth={periodMonth}
                paymentType={paymentType}
                categories={expenseCategories.map(c => c.name)}
                wage={{
                    dailyRate,
                    daysWorked,
                    commission,
                    totalWage,
                }}
                expenses={expenseData}
                totalExpense={totalExpense}
                grandTotal={grandTotal}
                attachments={attachments.map(a => ({
                    id: a.id,
                    fileName: a.fileName,
                    fileUrl: a.fileUrl,
                    fileType: a.fileType,
                    fileSize: a.fileSize,
                }))}
            />

            {/* Withholding Tax Download */}
            <WithholdingTaxButton
                channelStaffId={assignment.id}
                periodMonth={periodMonth}
                paymentType={paymentType}
                staffName={staffRecord.name}
                staffCode={staffRecord.code || staffId.slice(0, 8)}
                staffTaxId={staffRecord.taxId || undefined}
                staffAddress={staffRecord.address || undefined}
                channelName={periodMonth ? `${channel.name} (งวด ${formatPeriodMonthThai(periodMonth)})` : channel.name}
                channelCode={channel.code || channelId.slice(0, 8)}
                daysWorked={daysWorked}
                dailyRate={dailyRate}
                totalWage={totalWage}
                commission={commission}
                expenses={expenseData}
                whtIssued={stateSource?.whtIssued || false}
                whtDocNo={stateSource?.whtDocNo || undefined}
                whtPaidDate={stateSource?.whtPaidDate ? stateSource.whtPaidDate.toISOString().slice(0, 10) : undefined}
            />
        </div>
    );
}
