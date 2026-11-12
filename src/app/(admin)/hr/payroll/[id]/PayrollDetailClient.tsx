'use client';

import { useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
    ArrowLeft,
    Banknote,
    CreditCard,
    Users,
    CheckCircle2,
    Circle,
    FileCheck,
    Clock,
    Download,
    CalendarDays,
    Unlock,
    Building2,
} from 'lucide-react';
import { Spinner } from '@/components/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    toggleWagePaid,
    toggleCommissionPaid,
    markAllWagePaid,
    markAllCommissionPaid,
    updateStaffDailyRate,
    unlockPayrollSubmission,
} from '@/actions/channel';
import { formatPeriodMonthThai } from '@/lib/payroll-period';
import * as XLSX from 'xlsx';

type PayrollRow = {
    channelStaffId: string;
    staffId: string;
    name: string;
    role: string;
    isMain: boolean;
    dailyRate: number;
    daysWorked: number;
    totalWage: number;
    commissionRate: number;
    totalCommission: number;
    totalPay: number;
    staffCode: string;
    bankName: string;
    bankAccountNo: string;
    phone: string;
    paymentType: string;
    isWagePaid: boolean;
    wagePaidAt: string | null;
    isCommissionPaid: boolean;
    commissionPaidAt: string | null;
    isSubmitted: boolean;
    submittedAt: string | null;
    expenseAmount: number;
    travelExpense: number;
    setupExpense: number;
    teardownExpense: number;
    targetIncentive: number;
    otherExpense: number;
    withholdingTax: number;
    expenseDetailsStr: string;
    whtIssued: boolean;
    whtDocNo: string;
    whtPaidDate: string;
};

interface Props {
    channel: {
        id: string;
        type?: string;
        name: string;
        code: string;
        location: string;
        startDate: string | null;
        endDate: string | null;
    };
    periodMonth?: string | null;
    periodOptions?: { value: string; label: string }[];
    rows: PayrollRow[];
    totalChannelSales: number;
    salaryAccess?: string | null; // none, daily, monthly, all
}

export default function PayrollDetailClient({
    channel,
    periodMonth = null,
    periodOptions = [],
    rows: initialRows,
    totalChannelSales,
    salaryAccess,
}: Props) {
    const router = useRouter();
    const isBranch = channel.type === 'BRANCH';

    // Check if a specific payment type is visible
    const canView = (paymentType: string) => {
        if (!salaryAccess || salaryAccess === 'none') return false;
        if (salaryAccess === 'all') return true;
        return salaryAccess === paymentType; // 'daily' matches 'daily', 'monthly' matches 'monthly'
    };
    const canViewAny = canView('daily') || canView('monthly');
    const mask = (val: number | string, paymentType: string) =>
        !canView(paymentType) ? '***' : typeof val === 'number' ? val.toLocaleString() : val;

    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [localRows, setLocalRows] = useState(() =>
        [...initialRows].sort((a, b) => {
            const aDone = a.isWagePaid && a.isCommissionPaid ? 1 : 0;
            const bDone = b.isWagePaid && b.isCommissionPaid ? 1 : 0;
            return aDone - bDone;
        })
    );

    useEffect(() => {
        setLocalRows(
            [...initialRows].sort((a, b) => {
                const aDone = a.isWagePaid && a.isCommissionPaid ? 1 : 0;
                const bDone = b.isWagePaid && b.isCommissionPaid ? 1 : 0;
                return aDone - bDone;
            })
        );
    }, [initialRows]);

    const totalWage = localRows.reduce((sum, r) => sum + r.dailyRate * r.daysWorked, 0);
    const totalCommission = localRows.reduce((sum, r) => sum + r.totalCommission, 0);
    const totalExpense = localRows.reduce((sum, r) => sum + r.expenseAmount, 0);
    const totalWageExp = localRows.reduce((sum, r) => sum + (r.dailyRate * r.daysWorked) + r.expenseAmount, 0);
    const totalWithholdingTax = localRows.reduce((sum, r) => sum + r.withholdingTax, 0);
    const totalPay = localRows.reduce((sum, r) => sum + (r.dailyRate * r.daysWorked) + r.totalCommission + r.expenseAmount - r.withholdingTax, 0);
    const wagePaidCount = localRows.filter(r => r.isWagePaid).length;
    const comPaidCount = localRows.filter(r => r.isCommissionPaid).length;
    const allWagePaid = wagePaidCount === localRows.length && localRows.length > 0;
    const allComPaid = comPaidCount === localRows.length && localRows.length > 0;

    const handleToggleWage = (channelStaffId: string, current: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r =>
            r.channelStaffId === channelStaffId
                ? { ...r, isWagePaid: !current, wagePaidAt: !current ? now : null }
                : r
        ));
        setLoadingId(`w-${channelStaffId}`);
        startTransition(async () => {
            await toggleWagePaid(channelStaffId, !current, periodMonth);
            setLoadingId(null);
        });
    };

    const handleToggleCom = (channelStaffId: string, current: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r =>
            r.channelStaffId === channelStaffId
                ? { ...r, isCommissionPaid: !current, commissionPaidAt: !current ? now : null }
                : r
        ));
        setLoadingId(`c-${channelStaffId}`);
        startTransition(async () => {
            await toggleCommissionPaid(channelStaffId, !current, periodMonth);
            setLoadingId(null);
        });
    };

    const handleUnlockSubmission = (channelStaffId: string) => {
        setLocalRows(prev => prev.map(r =>
            r.channelStaffId === channelStaffId
                ? { ...r, isSubmitted: false, submittedAt: null }
                : r
        ));
        setLoadingId(`u-${channelStaffId}`);
        startTransition(async () => {
            await unlockPayrollSubmission(channelStaffId, periodMonth);
            setLoadingId(null);
        });
    };

    const handleMarkAllWage = (val: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r => ({ ...r, isWagePaid: val, wagePaidAt: val ? now : null })));
        setLoadingId('allW');
        startTransition(async () => {
            await markAllWagePaid(channel.id, val, periodMonth);
            setLoadingId(null);
        });
    };

    const handleMarkAllCom = (val: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r => ({ ...r, isCommissionPaid: val, commissionPaidAt: val ? now : null })));
        setLoadingId('allC');
        startTransition(async () => {
            await markAllCommissionPaid(channel.id, val, periodMonth);
            setLoadingId(null);
        });
    };

    const handleDailyRateChange = (channelStaffId: string, newRate: number) => {
        setLocalRows(prev => prev.map(r => {
            if (r.channelStaffId !== channelStaffId) return r;
            const totalWage = r.daysWorked * newRate;
            const totalWage401 = totalWage + (r.setupExpense || 0) + (r.teardownExpense || 0);
            const totalCommission402 = r.totalCommission + (r.targetIncentive || 0);
            const wageTax = Math.round(totalWage401 * 0.03 * 100) / 100;
            const commissionTax = Math.round(totalCommission402 * 0.03 * 100) / 100;
            const withholdingTax = wageTax + commissionTax;

            return {
                ...r,
                dailyRate: newRate,
                totalWage,
                withholdingTax,
                totalPay: totalWage + r.totalCommission
            };
        }));
        startTransition(async () => {
            await updateStaffDailyRate(channelStaffId, newRate || null, periodMonth);
        });
    };

    const handleExport = () => {
        const data = localRows.map((row, i) => {
            const netPay = (row.dailyRate * row.daysWorked) + row.totalCommission + row.expenseAmount - row.withholdingTax;
            return {
                'ลำดับ': i + 1,
                'รหัสสาขา/Event': channel.code,
                'ชื่อสาขา/Event': channel.name,
                ...(periodMonth ? { 'งวดเดือน': formatPeriodMonthThai(periodMonth) } : {}),
                'รหัส': row.staffCode,
                'ชื่อพนักงาน': row.name,
                'ประเภทการจ้าง': row.paymentType === 'monthly' ? 'รายเดือน' : 'รายวัน',
                'ธนาคาร': row.bankName !== '-' ? row.bankName : '',
                'เลขบัญชี': row.bankAccountNo !== '-' ? row.bankAccountNo : '',
                'ค่าแรง/เงินเดือน': row.dailyRate,
                'จำนวนวัน/งวด': row.daysWorked,
                'ค่าแรง/เงินเดือนรวม': row.totalWage,
                'ค่าลงงาน': row.setupExpense,
                'ค่าเก็บงาน': row.teardownExpense,
                'ค่าเดินทาง': row.travelExpense,
                'ค่าเป้า': row.targetIncentive,
                'ค่าใช้จ่ายอื่นๆ': row.otherExpense,
                'รายละเอียดเบิก': row.expenseDetailsStr,
                'ค่าใช้จ่ายเบิก': row.expenseAmount,
                'ค่าแรง+ค่าใช้จ่าย': row.totalWage + row.expenseAmount,
                'ค่าคอม': row.totalCommission,
                'หัก ณ ที่จ่าย 3%': row.withholdingTax,
                'ยอดโอนรวม': netPay,
                'ออก WHT': row.whtIssued ? 'ออก' : 'ไม่ออก',
                'เลขที่ WHT': row.whtDocNo || '',
                'วันที่จ่าย WHT': row.whtPaidDate || '',
                'โอนค่าแรง': row.isWagePaid ? 'โอนแล้ว' : 'ยังไม่โอน',
                'โอนคอม': row.isCommissionPaid ? 'โอนแล้ว' : 'ยังไม่โอน',
                'สถานะส่งเบิก': row.isSubmitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง',
            };
        });

        // Add totals row
        data.push({
            'ลำดับ': 0,
            'รหัสสาขา/Event': '',
            'ชื่อสาขา/Event': '',
            ...(periodMonth ? { 'งวดเดือน': '' } : {}),
            'รหัส': '',
            'ชื่อพนักงาน': 'รวมทั้งหมด',
            'ประเภทการจ้าง': '',
            'ธนาคาร': '',
            'เลขบัญชี': '',
            'ค่าแรง/เงินเดือน': 0,
            'จำนวนวัน/งวด': 0,
            'ค่าแรง/เงินเดือนรวม': totalWage,
            'ค่าลงงาน': localRows.reduce((sum, r) => sum + r.setupExpense, 0),
            'ค่าเก็บงาน': localRows.reduce((sum, r) => sum + r.teardownExpense, 0),
            'ค่าเดินทาง': localRows.reduce((sum, r) => sum + r.travelExpense, 0),
            'ค่าเป้า': localRows.reduce((sum, r) => sum + r.targetIncentive, 0),
            'ค่าใช้จ่ายอื่นๆ': localRows.reduce((sum, r) => sum + r.otherExpense, 0),
            'รายละเอียดเบิก': '',
            'ค่าใช้จ่ายเบิก': totalExpense,
            'ค่าแรง+ค่าใช้จ่าย': totalWageExp,
            'ค่าคอม': totalCommission,
            'หัก ณ ที่จ่าย 3%': totalWithholdingTax,
            'ยอดโอนรวม': totalPay,
            'ออก WHT': '',
            'เลขที่ WHT': '',
            'วันที่จ่าย WHT': '',
            'โอนค่าแรง': '',
            'โอนคอม': '',
            'สถานะส่งเบิก': '',
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'สรุปค่าแรง');

        const suffix = periodMonth ? `_${periodMonth}` : `_${new Date().toISOString().slice(0, 10)}`;
        XLSX.writeFile(wb, `payroll_${channel.code}${suffix}.xlsx`);
    };

    const handleExportKcash = () => {
        const headers = [
            'รหัสผู้รับเงิน / Vendor ID',
            'เลือกธนาคาร / Select Bank Code',
            'รหัสสาขาธนาคาร / Branch No.',
            'เลขที่บัญชี / Account Number',
            'ชื่อผู้รับเงิน / Vendor Name',
            'จำนวนเงิน / Amount',
            'เลขที่อ้างอิงรายการ / Bene Ref',
            'อีเมล / Advice Email',
            'หมายเลขโทรศัพท์มือถือ / SMS Tel. No',
            'รายละเอียดรายการ / Payment Detail'
        ];

        const getBankCode = (bankName: string) => {
            const name = (bankName || "").trim();
            if (name.includes("กสิกร")) return "002";
            if (name.includes("กรุงเทพ")) return "004";
            if (name.includes("กรุงไทย")) return "006";
            if (name.includes("ไทยพาณิชย์") || name.toLowerCase().includes("scb")) return "014";
            if (name.includes("กรุงศรี")) return "025";
            if (name.includes("ทหารไทย") || name.includes("ธนชาต") || name.toLowerCase().includes("ttb")) return "011";
            if (name.includes("ออมสิน")) return "030";
            if (name.includes("ธ.ก.ส.") || name.includes("ธกส")) return "034";
            return "";
        };

        const sheetData = localRows.map(row => {
            const bankCode = getBankCode(row.bankName);
            const cleanAccountNo = (row.bankAccountNo || "").replace(/[^0-9]/g, "");
            const netAmount = row.dailyRate * row.daysWorked + row.totalCommission + row.expenseAmount - row.withholdingTax;

            return [
                { t: 's', v: row.staffCode || "" },
                { t: 's', v: bankCode },
                { t: 's', v: "" }, // Branch No
                { t: 's', v: cleanAccountNo },
                { t: 's', v: row.name },
                { t: 'n', v: netAmount },
                { t: 's', v: periodMonth ? `${channel.code}-${periodMonth}` : channel.code }, // Bene Ref
                { t: 's', v: "" }, // Advice Email
                { t: 's', v: row.phone && row.phone !== '-' ? row.phone.replace(/[^0-9]/g, "") : "" }, // SMS Tel. No
                { t: 's', v: periodMonth ? `งวด ${formatPeriodMonthThai(periodMonth)}` : "" } // Payment Detail
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([
            headers.map(h => ({ t: 's', v: h })),
            ...sheetData
        ]);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'KCASH');

        ws['!cols'] = [
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 18 },
            { wch: 25 },
            { wch: 12 },
            { wch: 15 },
            { wch: 20 },
            { wch: 15 },
            { wch: 20 }
        ];

        const suffix = periodMonth ? `_${periodMonth}` : `_${new Date().toISOString().slice(0, 10)}`;
        XLSX.writeFile(wb, `kcash_${channel.code}${suffix}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Link
                        href={periodMonth ? `/hr/payroll?period=${periodMonth}` : "/hr/payroll"}
                        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" /> กลับ
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        {isBranch ? (
                            <Building2 className="h-6 w-6 text-indigo-600" />
                        ) : (
                            <Banknote className="h-6 w-6 text-teal-600" />
                        )}
                        {isBranch ? `สรุปเงินเดือน/ค่าแรงรายเดือน — ${channel.name}` : `สรุปค่าแรง — ${channel.name}`}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
                        <span className="font-mono">{channel.code}</span>
                        <span>{channel.location}</span>
                        {isBranch && periodMonth ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                <CalendarDays className="h-3.5 w-3.5" />
                                งวด {formatPeriodMonthThai(periodMonth)} (รอบจ่ายวันที่ 30)
                            </span>
                        ) : channel.startDate && (
                            <span>
                                {format(new Date(channel.startDate), 'd MMM', { locale: th })}
                                {channel.endDate && ` - ${format(new Date(channel.endDate), 'd MMM yy', { locale: th })}`}
                            </span>
                        )}
                    </div>
                </div>

                {/* Month Period Selector for Branch */}
                {isBranch && periodMonth && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2 self-start md:self-auto">
                        <CalendarDays className="h-4 w-4 text-indigo-600" />
                        <div>
                            <p className="text-[10px] font-semibold text-indigo-600 uppercase leading-none mb-0.5">
                                เลือกงวดเดือน (รอบจ่ายวันที่ 30)
                            </p>
                            <select
                                value={periodMonth}
                                onChange={(e) => router.push(`/hr/payroll/${channel.id}?period=${e.target.value}`)}
                                className="bg-transparent text-xs font-bold text-indigo-950 focus:outline-none cursor-pointer"
                            >
                                {periodOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">พนักงาน</p>
                    <p className="text-xl font-bold text-slate-700 flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-400" /> {localRows.length} คน
                    </p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">{isBranch ? 'เงินเดือน/ค่าแรงรวม' : 'ค่าแรงรวม'}</p>
                    <p className="text-xl font-bold text-slate-700">{!canViewAny ? '***' : `฿${totalWage.toLocaleString()}`}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าคอมรวม</p>
                    <p className="text-xl font-bold text-purple-700">{!canViewAny ? '***' : `฿${totalCommission.toLocaleString()}`}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าใช้จ่ายเบิก</p>
                    <p className="text-xl font-bold text-orange-600">{!canViewAny ? '***' : `฿${totalExpense.toLocaleString()}`}</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-emerald-200">
                    <p className="text-xs text-emerald-600 mb-1">ยอดโอนทั้งหมด</p>
                    <p className="text-xl font-bold text-emerald-700">{!canViewAny ? '***' : `฿${totalPay.toLocaleString()}`}</p>
                </div>
                <div className={`rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border ${allWagePaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                    <p className="text-xs text-slate-400 mb-1">{isBranch ? 'โอนเงินเดือน/ค่าแรง' : 'โอนค่าแรง'}</p>
                    <p className={`text-xl font-bold ${allWagePaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {wagePaidCount}/{localRows.length}
                    </p>
                </div>
                <div className={`rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border ${allComPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                    <p className="text-xs text-slate-400 mb-1">โอนคอม</p>
                    <p className={`text-xl font-bold ${allComPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {comPaidCount}/{localRows.length}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        รายละเอียดโอนเงิน {isBranch && periodMonth ? `(งวด ${formatPeriodMonthThai(periodMonth)})` : ''}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-md text-xs font-medium border border-teal-100">
                            {isBranch && periodMonth ? `ยอดขายเดือนนี้: ฿${totalChannelSales.toLocaleString()}` : `ยอดขายรวม: ฿${totalChannelSales.toLocaleString()}`}
                        </span>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                            <Download className="h-3 w-3" /> Export Excel
                        </button>
                        <button
                            onClick={handleExportKcash}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-colors"
                        >
                            <Download className="h-3 w-3" /> Export KCASH
                        </button>
                        <button
                            onClick={() => handleMarkAllWage(!allWagePaid)}
                            disabled={isPending}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${allWagePaid ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {loadingId === 'allW' ? <Spinner size="xs" /> : allWagePaid ? <Circle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {allWagePaid ? 'ยกเลิกโอนค่าแรง/เงินเดือน' : 'โอนค่าแรง/เงินเดือนทั้งหมด'}
                        </button>
                        <button
                            onClick={() => handleMarkAllCom(!allComPaid)}
                            disabled={isPending}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${allComPaid ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                        >
                            {loadingId === 'allC' ? <Spinner size="xs" /> : allComPaid ? <Circle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {allComPaid ? 'ยกเลิกคอม' : 'โอนคอมทั้งหมด'}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/50 text-slate-600">
                            <tr>
                                <th className="px-3 py-3 text-center text-xs font-semibold w-10">ค่าแรง</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold w-10">คอม</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold w-20">สถานะ</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold w-12">รหัส</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold">ชื่อพนักงาน</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold">บัญชีธนาคาร</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold w-14">วัน/ประเภท</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold w-24">อัตรา/เงินเดือน</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">ค่าแรง/เงินเดือนรวม</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">เบิกค่าใช้จ่าย</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold bg-blue-50/50 border-l border-r border-slate-200">ค่าแรง+เบิก</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">ค่าคอม</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold text-red-600">หัก ณ ที่จ่าย 3%</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold bg-emerald-50/50 border-l border-slate-200">ยอดโอนรวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {localRows.map(row => {
                                const bothPaid = row.isWagePaid && row.isCommissionPaid;
                                const isMonthly = row.paymentType === 'monthly';
                                const staffDetailHref = periodMonth
                                    ? `/hr/payroll/${channel.id}/staff/${row.staffId}?period=${periodMonth}`
                                    : `/hr/payroll/${channel.id}/staff/${row.staffId}`;

                                return (
                                    <tr key={row.staffId} className={`transition-colors ${bothPaid ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                                        {/* Wage checkbox */}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleWage(row.channelStaffId, row.isWagePaid)}
                                                disabled={isPending}
                                                title={row.isWagePaid ? `โอนแล้ว ${row.wagePaidAt ? format(new Date(row.wagePaidAt), 'd MMM yy HH:mm', { locale: th }) : ''}` : 'ยังไม่โอน'}
                                            >
                                                {loadingId === `w-${row.channelStaffId}` ? (
                                                    <Spinner size="sm" className="text-slate-400" />
                                                ) : row.isWagePaid ? (
                                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                                                )}
                                            </button>
                                        </td>
                                        {/* Commission checkbox */}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleCom(row.channelStaffId, row.isCommissionPaid)}
                                                disabled={isPending}
                                                title={row.isCommissionPaid ? `โอนคอมแล้ว ${row.commissionPaidAt ? format(new Date(row.commissionPaidAt), 'd MMM yy HH:mm', { locale: th }) : ''}` : 'ยังไม่โอนคอม'}
                                            >
                                                {loadingId === `c-${row.channelStaffId}` ? (
                                                    <Spinner size="sm" className="text-slate-400" />
                                                ) : row.isCommissionPaid ? (
                                                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                                                )}
                                            </button>
                                        </td>
                                        {/* Submit status + Unlock button */}
                                        <td className="px-3 py-3 text-center">
                                            {row.isSubmitted ? (
                                                <div className="inline-flex items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                        <FileCheck className="h-3 w-3" /> ส่งแล้ว
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlockSubmission(row.channelStaffId)}
                                                        disabled={isPending}
                                                        title="ปลดล็อคเพื่อให้พนักงานแก้ไข/ส่งเบิกใหม่"
                                                        className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                                                    >
                                                        {loadingId === `u-${row.channelStaffId}` ? (
                                                            <Spinner size="xs" />
                                                        ) : (
                                                            <Unlock className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                                                    <Clock className="h-3 w-3" /> รอส่ง
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs font-mono text-slate-500">{row.staffCode}</td>
                                        <td className="px-3 py-3">
                                            <Link href={staffDetailHref} className="hover:underline">
                                                <span className={`font-medium ${bothPaid ? 'text-slate-500' : 'text-blue-700'}`}>{row.name}</span>
                                            </Link>
                                            {row.isMain && (
                                                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">หัวหน้า</span>
                                            )}
                                            {isMonthly && (
                                                <span className="ml-1.5 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">รายเดือน</span>
                                            )}
                                            {row.isWagePaid && row.wagePaidAt && (
                                                <span className="block text-[10px] text-blue-400 mt-0.5">
                                                    โอนค่าแรง {format(new Date(row.wagePaidAt), 'd MMM HH:mm', { locale: th })}
                                                </span>
                                            )}
                                            {row.isCommissionPaid && row.commissionPaidAt && (
                                                <span className="block text-[10px] text-purple-400">
                                                    โอนคอม {format(new Date(row.commissionPaidAt), 'd MMM HH:mm', { locale: th })}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.bankName !== '-' ? (
                                                <div>
                                                    <span className="text-xs text-slate-500">{row.bankName}</span>
                                                    <span className="block font-mono text-sm text-slate-800 tracking-wider">{row.bankAccountNo !== '-' ? row.bankAccountNo : ''}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">ยังไม่ระบุ</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center text-slate-600">
                                            {isMonthly ? (
                                                <span className="text-[11px] font-medium text-indigo-600">เหมาเดือน</span>
                                            ) : (
                                                `${row.daysWorked} วัน`
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right text-slate-600">
                                            {mask(row.dailyRate, row.paymentType)}
                                        </td>
                                        <td className={`px-3 py-3 text-right font-medium ${row.isWagePaid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                            {mask(row.dailyRate * row.daysWorked, row.paymentType)}
                                        </td>
                                        <td className={`px-3 py-3 text-right ${row.isWagePaid ? 'text-slate-400 line-through' : 'text-orange-600'}`}>
                                            {!canView(row.paymentType) ? '***' : row.expenseAmount > 0 ? row.expenseAmount.toLocaleString() : '-'}
                                        </td>
                                        <td className={`px-3 py-3 text-right font-semibold border-l border-r border-slate-100 ${row.isWagePaid ? 'text-slate-400 line-through bg-blue-50/10' : 'text-blue-700 bg-blue-50/20'}`}>
                                            {!canView(row.paymentType) ? '***' : (row.dailyRate * row.daysWorked + row.expenseAmount) > 0 ? `฿${(row.dailyRate * row.daysWorked + row.expenseAmount).toLocaleString()}` : '-'}
                                        </td>
                                        <td className={`px-3 py-3 text-right ${row.isCommissionPaid ? 'text-slate-400 line-through' : 'text-purple-600'}`}>
                                            {!canView(row.paymentType) ? '***' : row.totalCommission > 0 ? row.totalCommission.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-3 py-3 text-right text-red-600 font-medium">
                                            {!canView(row.paymentType) ? '***' : row.withholdingTax > 0 ? `฿${row.withholdingTax.toLocaleString()}` : '-'}
                                        </td>
                                        <td className={`px-3 py-3 text-right font-bold border-l border-slate-100 ${bothPaid ? 'text-emerald-500 line-through' : 'text-emerald-700 bg-emerald-50/20'}`}>
                                            {!canView(row.paymentType) ? '***' : `฿${(row.dailyRate * row.daysWorked + row.totalCommission + row.expenseAmount - row.withholdingTax).toLocaleString()}`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                            <tr>
                                <td colSpan={8} className="px-3 py-3 text-right text-slate-500">รวมทั้งหมด</td>
                                <td className="px-3 py-3 text-right text-slate-900">{!canViewAny ? '***' : totalWage.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-orange-700">{!canViewAny ? '***' : totalExpense.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-blue-700 border-l border-r border-slate-200 font-bold">{!canViewAny ? '***' : `฿${totalWageExp.toLocaleString()}`}</td>
                                <td className="px-3 py-3 text-right text-purple-700">{!canViewAny ? '***' : totalCommission.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-red-700 font-medium">{!canViewAny ? '***' : totalWithholdingTax.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-emerald-700 text-base border-l border-slate-200">
                                    {!canViewAny ? '***' : `฿${totalPay.toLocaleString()}`}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Notes */}
            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                <p className="font-semibold mb-1">หมายเหตุ:</p>
                <ul className="list-disc pl-4 space-y-0.5 opacity-80">
                    <li>กดไอคอน ○ เพื่อเปลี่ยนสถานะ — <span className="text-blue-600">ค่าแรง/เงินเดือน</span> กับ <span className="text-purple-600">คอม</span> แยกกัน</li>
                    <li>คลิกชื่อพนักงานเพื่อดูรายละเอียด แก้ไขเงินเดือน/ค่าแรง/ค่าใช้จ่าย และออกใบหัก ณ ที่จ่าย (ภ.ง.ด.3)</li>
                    <li>คอลัมน์ <b>ค่าแรง+เบิก</b> = เงินเดือน/ค่าแรงรวม + ค่าใช้จ่ายเบิก (โอนพร้อมกัน)</li>
                    {isBranch && <li>สำหรับสาขา ระบบแยกสถานะการเบิกและการจ่ายตามงวดเดือน (รอบจ่ายทุกวันที่ 30)</li>}
                </ul>
            </div>
        </div>
    );
}
