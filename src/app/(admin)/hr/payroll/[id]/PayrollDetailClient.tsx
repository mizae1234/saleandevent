'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, Banknote, CreditCard, Users, CheckCircle2, Circle, FileCheck, Clock, Download } from 'lucide-react';
import { Spinner } from '@/components/shared';
import Link from 'next/link';
import { toggleWagePaid, toggleCommissionPaid, markAllWagePaid, markAllCommissionPaid, updateStaffDailyRate } from '@/actions/channel';
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
};

interface Props {
    channel: {
        id: string;
        name: string;
        code: string;
        location: string;
        startDate: string | null;
        endDate: string | null;
    };
    rows: PayrollRow[];
    totalChannelSales: number;
    salaryAccess?: string | null; // none, daily, monthly, all
}

export default function PayrollDetailClient({ channel, rows: initialRows, totalChannelSales, salaryAccess }: Props) {
    // Check if a specific payment type is visible
    const canView = (paymentType: string) => {
        if (!salaryAccess || salaryAccess === 'none') return false;
        if (salaryAccess === 'all') return true;
        return salaryAccess === paymentType; // 'daily' matches 'daily', 'monthly' matches 'monthly'
    };
    const mask = (val: number | string, paymentType: string) => !canView(paymentType) ? '***' : typeof val === 'number' ? val.toLocaleString() : val;
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const [localRows, setLocalRows] = useState(() =>
        [...initialRows].sort((a, b) => {
            const aDone = a.isWagePaid && a.isCommissionPaid ? 1 : 0;
            const bDone = b.isWagePaid && b.isCommissionPaid ? 1 : 0;
            return aDone - bDone;
        })
    );

    const totalWage = localRows.reduce((sum, r) => sum + r.dailyRate * r.daysWorked, 0);
    const totalCommission = localRows.reduce((sum, r) => sum + r.totalCommission, 0);
    const totalExpense = localRows.reduce((sum, r) => sum + r.expenseAmount, 0);
    const totalWageExp = localRows.reduce((sum, r) => sum + (r.dailyRate * r.daysWorked) + r.expenseAmount, 0);
    const totalPay = localRows.reduce((sum, r) => sum + (r.dailyRate * r.daysWorked) + r.totalCommission + r.expenseAmount, 0);
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
            await toggleWagePaid(channelStaffId, !current);
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
            await toggleCommissionPaid(channelStaffId, !current);
            setLoadingId(null);
        });
    };

    const handleMarkAllWage = (val: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r => ({ ...r, isWagePaid: val, wagePaidAt: val ? now : null })));
        setLoadingId('allW');
        startTransition(async () => {
            await markAllWagePaid(channel.id, val);
            setLoadingId(null);
        });
    };

    const handleMarkAllCom = (val: boolean) => {
        const now = new Date().toISOString();
        setLocalRows(prev => prev.map(r => ({ ...r, isCommissionPaid: val, commissionPaidAt: val ? now : null })));
        setLoadingId('allC');
        startTransition(async () => {
            await markAllCommissionPaid(channel.id, val);
            setLoadingId(null);
        });
    };

    const handleDailyRateChange = (channelStaffId: string, newRate: number) => {
        setLocalRows(prev => prev.map(r => {
            if (r.channelStaffId !== channelStaffId) return r;
            const totalWage = r.daysWorked * newRate;
            return { ...r, dailyRate: newRate, totalWage, totalPay: totalWage + r.totalCommission };
        }));
        startTransition(async () => {
            await updateStaffDailyRate(channelStaffId, newRate || null);
        });
    };

    const handleExport = () => {
        const data = localRows.map((row, i) => ({
            'ลำดับ': i + 1,
            'รหัส': row.staffCode,
            'ชื่อพนักงาน': row.name,
            'ธนาคาร': row.bankName !== '-' ? row.bankName : '',
            'เลขบัญชี': row.bankAccountNo !== '-' ? row.bankAccountNo : '',
            'ค่าแรง/วัน': row.dailyRate,
            'จำนวนวัน': row.daysWorked,
            'ค่าแรงรวม': row.totalWage,
            'ค่าใช้จ่ายเบิก': row.expenseAmount,
            'ค่าแรง+ค่าใช้จ่าย': row.totalWage + row.expenseAmount,
            'ค่าคอม': row.totalCommission,
            'ยอดโอนรวม': row.totalPay + row.expenseAmount,
            'โอนค่าแรง': row.isWagePaid ? 'โอนแล้ว' : 'ยังไม่โอน',
            'โอนคอม': row.isCommissionPaid ? 'โอนแล้ว' : 'ยังไม่โอน',
            'สถานะส่งเบิก': row.isSubmitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง',
        }));

        // Add totals row
        data.push({
            'ลำดับ': 0,
            'รหัส': '',
            'ชื่อพนักงาน': 'รวมทั้งหมด',
            'ธนาคาร': '',
            'เลขบัญชี': '',
            'ค่าแรง/วัน': 0,
            'จำนวนวัน': 0,
            'ค่าแรงรวม': totalWage,
            'ค่าใช้จ่ายเบิก': totalExpense,
            'ค่าแรง+ค่าใช้จ่าย': totalWageExp,
            'ค่าคอม': totalCommission,
            'ยอดโอนรวม': totalPay,
            'โอนค่าแรง': '',
            'โอนคอม': '',
            'สถานะส่งเบิก': '',
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'สรุปค่าแรง');

        // Set column widths
        ws['!cols'] = [
            { wch: 5 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
            { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        ];

        XLSX.writeFile(wb, `payroll_${channel.code}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link href="/hr/payroll" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-3">
                    <ArrowLeft className="h-4 w-4" /> กลับ
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Banknote className="h-6 w-6 text-teal-600" />
                    สรุปค่าแรง — {channel.name}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                    <span>{channel.code}</span>
                    <span>{channel.location}</span>
                    {channel.startDate && (
                        <span>
                            {format(new Date(channel.startDate), 'd MMM', { locale: th })}
                            {channel.endDate && ` - ${format(new Date(channel.endDate), 'd MMM yy', { locale: th })}`}
                        </span>
                    )}
                </div>
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
                    <p className="text-xs text-slate-400 mb-1">ค่าแรงรวม</p>
                    <p className="text-xl font-bold text-slate-700">{!canView('daily') ? '***' : `฿${totalWage.toLocaleString()}`}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าคอมรวม</p>
                    <p className="text-xl font-bold text-purple-700">{!canView('daily') ? '***' : `฿${totalCommission.toLocaleString()}`}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">ค่าใช้จ่ายเบิก</p>
                    <p className="text-xl font-bold text-orange-600">{!canView('daily') ? '***' : `฿${totalExpense.toLocaleString()}`}</p>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-emerald-200">
                    <p className="text-xs text-emerald-600 mb-1">ยอดโอนทั้งหมด</p>
                    <p className="text-xl font-bold text-emerald-700">{!canView('daily') ? '***' : `฿${totalPay.toLocaleString()}`}</p>
                </div>
                <div className={`rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border ${allWagePaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                    <p className="text-xs text-slate-400 mb-1">โอนค่าแรง</p>
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
                        รายละเอียดโอนเงิน
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-teal-50 text-teal-700 px-3 py-1 rounded-md text-xs font-medium border border-teal-100">
                            ยอดขายรวม: ฿{totalChannelSales.toLocaleString()}
                        </span>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                            <Download className="h-3 w-3" /> Export Excel
                        </button>
                        <button
                            onClick={() => handleMarkAllWage(!allWagePaid)}
                            disabled={isPending}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${allWagePaid ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {loadingId === 'allW' ? <Spinner size="xs" /> : allWagePaid ? <Circle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {allWagePaid ? 'ยกเลิกค่าแรง' : 'โอนค่าแรงทั้งหมด'}
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
                                <th className="px-3 py-3 text-center text-xs font-semibold w-14">สถานะ</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold w-12">รหัส</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold">ชื่อพนักงาน</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold">บัญชีธนาคาร</th>
                                <th className="px-3 py-3 text-center text-xs font-semibold w-8">วัน</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold w-20">ค่าแรง/วัน</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">ค่าแรงรวม</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">เบิกค่าใช้จ่าย</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold bg-blue-50/50 border-l border-r border-slate-200">ค่าแรง+เบิก</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold">ค่าคอม</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold bg-emerald-50/50 border-l border-slate-200">ยอดโอนรวม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {localRows.map(row => {
                                const bothPaid = row.isWagePaid && row.isCommissionPaid;
                                const wageExpSub = row.totalWage + row.expenseAmount;

                                return (
                                    <tr key={row.staffId} className={`transition-colors ${bothPaid ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'}`}>
                                        {/* Wage checkbox */}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleWage(row.channelStaffId, row.isWagePaid)}
                                                disabled={isPending}
                                                title={row.isWagePaid ? `โอนค่าแรงแล้ว ${row.wagePaidAt ? format(new Date(row.wagePaidAt), 'd MMM yy HH:mm', { locale: th }) : ''}` : 'ยังไม่โอนค่าแรง'}
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
                                        {/* Submit status */}
                                        <td className="px-3 py-3 text-center">
                                            {row.isSubmitted ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                    <FileCheck className="h-3 w-3" /> ส่งแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                                                    <Clock className="h-3 w-3" /> รอส่ง
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-xs font-mono text-slate-500">{row.staffCode}</td>
                                        <td className="px-3 py-3">
                                            <Link href={`/hr/payroll/${channel.id}/staff/${row.staffId}`} className="hover:underline">
                                                <span className={`font-medium ${bothPaid ? 'text-slate-500' : 'text-blue-700'}`}>{row.name}</span>
                                            </Link>
                                            {row.isMain && (
                                                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">หัวหน้า</span>
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
                                        <td className="px-3 py-3 text-center text-slate-600">{row.daysWorked}</td>
                                        <td className="px-3 py-3 text-right text-slate-600">{mask(row.dailyRate, row.paymentType)}</td>
                                        <td className={`px-3 py-3 text-right font-medium ${row.isWagePaid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{mask(row.dailyRate * row.daysWorked, row.paymentType)}</td>
                                        <td className={`px-3 py-3 text-right ${row.isWagePaid ? 'text-slate-400 line-through' : 'text-orange-600'}`}>{!canView(row.paymentType) ? '***' : row.expenseAmount > 0 ? row.expenseAmount.toLocaleString() : '-'}</td>
                                        <td className={`px-3 py-3 text-right font-semibold border-l border-r border-slate-100 ${row.isWagePaid ? 'text-slate-400 line-through bg-blue-50/10' : 'text-blue-700 bg-blue-50/20'}`}>
                                            {!canView(row.paymentType) ? '***' : (row.dailyRate * row.daysWorked + row.expenseAmount) > 0 ? `฿${(row.dailyRate * row.daysWorked + row.expenseAmount).toLocaleString()}` : '-'}
                                        </td>
                                        <td className={`px-3 py-3 text-right ${row.isCommissionPaid ? 'text-slate-400 line-through' : 'text-purple-600'}`}>{!canView(row.paymentType) ? '***' : row.totalCommission > 0 ? row.totalCommission.toLocaleString() : '-'}</td>
                                        <td className={`px-3 py-3 text-right font-bold border-l border-slate-100 ${bothPaid ? 'text-emerald-500 line-through' : 'text-emerald-700 bg-emerald-50/20'}`}>
                                            {!canView(row.paymentType) ? '***' : `฿${(row.dailyRate * row.daysWorked + row.totalCommission + row.expenseAmount).toLocaleString()}`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                            <tr>
                                <td colSpan={8} className="px-3 py-3 text-right text-slate-500">รวมทั้งหมด</td>
                                <td className="px-3 py-3 text-right text-slate-900">{!canView('daily') ? '***' : totalWage.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-orange-700">{!canView('daily') ? '***' : totalExpense.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-blue-700 border-l border-r border-slate-200 font-bold">{!canView('daily') ? '***' : `฿${totalWageExp.toLocaleString()}`}</td>
                                <td className="px-3 py-3 text-right text-purple-700">{!canView('daily') ? '***' : totalCommission.toLocaleString()}</td>
                                <td className="px-3 py-3 text-right text-emerald-700 text-base border-l border-slate-200">
                                    {!canView('daily') ? '***' : `฿${totalPay.toLocaleString()}`}
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
                    <li>กดไอคอน ○ เพื่อเปลี่ยนสถานะ — <span className="text-blue-600">ค่าแรง</span> กับ <span className="text-purple-600">คอม</span> แยกกัน</li>
                    <li>คลิกชื่อพนักงานเพื่อดูรายละเอียดและแก้ไขข้อมูล</li>
                    <li>คอลัมน์ <b>ค่าแรง+เบิก</b> = ค่าแรงรวม + ค่าใช้จ่ายเบิก (โอนพร้อมกัน)</li>
                </ul>
            </div>
        </div >
    );
}
