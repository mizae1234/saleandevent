"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2, DollarSign, Users, Save, CheckCircle2 } from "lucide-react";
import { getChannelCompensationSummary, saveStaffCompensation } from "@/actions/channel-actions";

type StaffSummary = {
    channelStaffId: string;
    staffId: string;
    name: string;
    role: string;
    isMain: boolean;
    dailyRate: number;
    attendanceDays: number;
    daysWorked: number;
    totalWage: number;
    commissionRate: number;
    totalCommission: number;
    totalPay: number;
};

type CompensationData = {
    channelId: string;
    channelName: string;
    totalChannelSales: number;
    staffSummary: StaffSummary[];
    totalStaffCost: number;
};

type EditRow = {
    channelStaffId: string;
    daysWorked: number;
    commissionRate: number;
};

export function EventCompensation({ channelId, readonly = false }: { channelId: string; readonly?: boolean }) {
    const [data, setData] = useState<CompensationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [edits, setEdits] = useState<EditRow[]>([]);

    const fetchData = async () => {
        try {
            const result = await getChannelCompensationSummary(channelId);
            setData(result);
            // Initialize edit state from data
            setEdits(result.staffSummary.map(s => ({
                channelStaffId: s.channelStaffId,
                daysWorked: s.daysWorked,
                commissionRate: s.commissionRate,
            })));
        } catch (error) {
            console.error("Failed to fetch compensation:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [channelId]);

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        setSaved(false);
        try {
            await saveStaffCompensation(channelId, edits);
            await fetchData();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setSaving(false);
        }
    };

    const updateEdit = (channelStaffId: string, field: 'daysWorked' | 'commissionRate', value: number) => {
        setEdits(prev => prev.map(e =>
            e.channelStaffId === channelStaffId ? { ...e, [field]: value } : e
        ));
    };

    // Check if any edits differ from original data
    const hasChanges = data ? edits.some(e => {
        const original = data.staffSummary.find(s => s.channelStaffId === e.channelStaffId);
        if (!original) return false;
        return e.daysWorked !== original.daysWorked || e.commissionRate !== original.commissionRate;
    }) : false;

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100 flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!data) return null;

    // Calculate live totals from edits
    const liveRows = data.staffSummary.map(staff => {
        const edit = edits.find(e => e.channelStaffId === staff.channelStaffId);
        const daysWorked = edit?.daysWorked ?? staff.daysWorked;
        const commissionRate = edit?.commissionRate ?? staff.commissionRate;
        const totalWage = daysWorked * staff.dailyRate;
        const totalCommission = commissionRate;
        return {
            ...staff,
            daysWorked,
            commissionRate,
            totalWage,
            totalCommission,
            totalPay: totalWage + totalCommission,
        };
    });

    const totalWage = liveRows.reduce((sum, s) => sum + s.totalWage, 0);
    const totalCommission = liveRows.reduce((sum, s) => sum + s.totalCommission, 0);
    const totalPayAll = liveRows.reduce((sum, s) => sum + s.totalPay, 0);

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Users className="h-5 w-5 text-slate-400" />
                    สรุปค่าตอบแทนทีมงาน
                </h3>
                <div className="flex items-center gap-3">
                    <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded-md text-sm font-medium border border-teal-100 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        ยอดขายรวม: ฿{data.totalChannelSales.toLocaleString()}
                    </div>
                    {!readonly && (
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${saved
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : hasChanges
                                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : saved ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว' : 'บันทึก'}
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">ชื่อพนักงาน</th>
                            <th className="px-4 py-3 text-right">ค่าแรง/วัน</th>
                            <th className="px-4 py-3 text-center">วันทำงาน</th>
                            <th className="px-4 py-3 text-right">ค่าคอมฯ</th>
                            <th className="px-4 py-3 text-right text-slate-900 bg-slate-100/50 font-semibold border-l border-slate-200">ค่าแรงรวม</th>
                            <th className="px-4 py-3 text-right font-bold text-emerald-600 rounded-tr-lg border-l border-slate-200 bg-emerald-50/30">รวมสุทธิ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {liveRows.map((staff) => {
                            const edit = edits.find(e => e.channelStaffId === staff.channelStaffId);
                            return (
                                <tr key={staff.staffId} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900">
                                        {staff.name}
                                        <span className="ml-2 text-xs text-slate-400 font-normal">({staff.role})</span>
                                        {staff.isMain && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">HQ</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {staff.dailyRate > 0 ? staff.dailyRate.toLocaleString() : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={edit?.daysWorked ?? staff.daysWorked}
                                            onFocus={e => e.target.select()}
                                            onChange={e => {
                                                const v = e.target.value.replace(/[^0-9]/g, '');
                                                updateEdit(staff.channelStaffId, 'daysWorked', v === '' ? 0 : parseInt(v));
                                            }}
                                            disabled={readonly}
                                            className={`w-16 text-center border border-slate-200 rounded-md px-1.5 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors ${readonly ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={edit?.commissionRate ?? staff.commissionRate}
                                            onFocus={e => e.target.select()}
                                            onChange={e => {
                                                const v = e.target.value.replace(/[^0-9.]/g, '');
                                                updateEdit(staff.channelStaffId, 'commissionRate', v === '' ? 0 : parseFloat(v) || 0);
                                            }}
                                            disabled={readonly}
                                            className={`w-24 text-right border border-slate-200 rounded-md px-1.5 py-1 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:outline-none transition-colors ${readonly ? 'bg-slate-50 text-slate-500 cursor-default' : ''}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-slate-700 bg-slate-50/30 border-l border-slate-100">
                                        {staff.totalWage.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600 border-l border-slate-100 bg-emerald-50/10">
                                        {staff.totalPay.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-slate-500">รวมทั้งหมด</td>
                            <td className="px-4 py-3 text-right border-l border-slate-200">{totalWage.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-emerald-700 border-l border-slate-200">{totalPayAll.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                <p className="font-semibold mb-1">หมายเหตุ:</p>
                <ul className="list-disc pl-4 space-y-1 opacity-80">
                    <li>แก้ไข จำนวนวันทำงาน และ ค่าคอมฯ ได้โดยตรง แล้วกด <strong>บันทึก</strong></li>
                    <li>ค่าแรงรวม = วันทำงาน &times; ค่าแรง/วัน</li>
                    <li>รวมสุทธิ = ค่าแรงรวม + ค่าคอมฯ</li>
                </ul>
            </div>
        </div>
    );
}
