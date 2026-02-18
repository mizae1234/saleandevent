"use client";

import { useEffect, useState } from "react";
import { Coins, Loader2, DollarSign, Users } from "lucide-react";
import { getChannelCompensationSummary } from "@/actions/channel-actions";

type StaffSummary = {
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
};

type CompensationData = {
    channelId: string;
    channelName: string;
    totalChannelSales: number;
    staffSummary: StaffSummary[];
    totalStaffCost: number;
};

export function EventCompensation({ channelId }: { channelId: string }) {
    const [data, setData] = useState<CompensationData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getChannelCompensationSummary(channelId);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch compensation:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [channelId]);

    if (loading) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!data) return null;

    const totalWage = data.staffSummary.reduce((sum, s) => sum + s.totalWage, 0);
    const totalCommission = data.staffSummary.reduce((sum, s) => sum + s.totalCommission, 0);
    const totalPayAll = data.staffSummary.reduce((sum, s) => sum + s.totalPay, 0);

    return (
        <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Users className="h-5 w-5 text-slate-400" />
                    สรุปค่าตอบแทนทีมงาน
                </h3>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium border border-indigo-100 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ยอดขายรวม: ฿{data.totalChannelSales.toLocaleString()}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">ชื่อพนักงาน</th>
                            <th className="px-4 py-3 text-right">ค่าแรง/วัน</th>
                            <th className="px-4 py-3 text-center">วันทำงาน</th>
                            <th className="px-4 py-3 text-right">คอมฯ/วัน</th>
                            <th className="px-4 py-3 text-right text-slate-900 bg-slate-100/50 font-semibold border-l border-slate-200">ค่าแรงรวม</th>
                            <th className="px-4 py-3 text-right text-slate-900 bg-slate-100/50 font-semibold">ค่าคอมฯ</th>
                            <th className="px-4 py-3 text-right font-bold text-emerald-600 rounded-tr-lg border-l border-slate-200 bg-emerald-50/30">รวมสุทธิ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.staffSummary.map((staff) => (
                            <tr key={staff.staffId} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {staff.name}
                                    <span className="ml-2 text-xs text-slate-400 font-normal">({staff.role})</span>
                                    {staff.isMain && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">HQ</span>}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    {staff.dailyRate > 0 ? staff.dailyRate.toLocaleString() : "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {staff.daysWorked > 0 ? (
                                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                                            {staff.daysWorked} วัน
                                        </span>
                                    ) : "-"}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                    {staff.commissionRate.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-700 bg-slate-50/30 border-l border-slate-100">
                                    {staff.totalWage.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-slate-700 bg-slate-50/30">
                                    {staff.totalCommission > 0 ? staff.totalCommission.toLocaleString() : "-"}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600 border-l border-slate-100 bg-emerald-50/10">
                                    {staff.totalPay.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-slate-500">รวมทั้งหมด</td>
                            <td className="px-4 py-3 text-right border-l border-slate-200">{totalWage.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{totalCommission > 0 ? totalCommission.toLocaleString() : "-"}</td>
                            <td className="px-4 py-3 text-right text-emerald-700 border-l border-slate-200">{totalPayAll.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                <p className="font-semibold mb-1">หมายเหตุการคำนวณ:</p>
                <ul className="list-disc pl-4 space-y-1 opacity-80">
                    <li>ค่าแรงรวม = จำนวนวันทำงาน (อิงจากเวลาเข้างาน) &times; ค่าแรงรายวัน</li>
                    <li>ค่าคอมมิชชั่น = (รอการกำหนดเงื่อนไขจากระบบ)</li>
                    <li>ยอดขายส่วนตัว = ยอดขายที่พนักงานเป็นคนเปิดบิล (Active Bills)</li>
                </ul>
            </div>
        </div>
    );
}
