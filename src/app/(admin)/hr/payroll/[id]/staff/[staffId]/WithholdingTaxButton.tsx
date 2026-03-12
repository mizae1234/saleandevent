'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Spinner } from '@/components/shared';
import { generateWithholdingTaxPdf, type WithholdingTaxData } from '@/lib/withholding-tax-pdf';

interface Props {
    staffName: string;
    staffCode: string;
    channelName: string;
    channelCode: string;
    daysWorked: number;
    dailyRate: number;
    totalWage: number;
}

const TAX_THRESHOLD_DAYS = 10;
const TAX_RATE = 0.03;

export function WithholdingTaxButton({
    staffName, staffCode, channelName, channelCode,
    daysWorked, dailyRate, totalWage,
}: Props) {
    const [loading, setLoading] = useState(false);

    const shouldWithhold = daysWorked > TAX_THRESHOLD_DAYS;
    const taxAmount = shouldWithhold ? Math.round(totalWage * TAX_RATE * 100) / 100 : 0;
    const netPayable = totalWage - taxAmount;

    const handleDownload = async () => {
        setLoading(true);
        try {
            const data: WithholdingTaxData = {
                staffName,
                staffCode,
                channelName,
                channelCode,
                daysWorked,
                dailyRate,
                totalWage,
                taxRate: shouldWithhold ? TAX_RATE : 0,
                taxAmount,
                netPayable,
                documentDate: new Date().toISOString(),
            };
            await generateWithholdingTaxPdf(data);
        } catch (err) {
            console.error('Failed to generate WHT PDF:', err);
        } finally {
            setLoading(false);
        }
    };

    // ≤ 10 days: no tax, but still downloadable
    if (!shouldWithhold) {
        return (
            <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-700">ใบหัก ณ ที่จ่าย</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            ทำงาน {daysWorked} วัน — ไม่เกิน 10 วัน ไม่หักภาษี 3%
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between">
                        <span className="text-slate-500">ค่าแรงรวม</span>
                        <span className="text-slate-800">฿{totalWage.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">หัก ณ ที่จ่าย 3%</span>
                        <span className="text-slate-400">฿0</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-100">
                        <span className="text-slate-700 font-medium">จ่ายจริง</span>
                        <span className="text-slate-900 font-bold">฿{totalWage.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
                >
                    {loading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                    {loading ? 'กำลังสร้าง...' : 'ดาวน์โหลดใบหัก ณ ที่จ่าย'}
                </button>
            </div>
        );
    }

    // > 10 days: 3% withholding
    return (
        <div className="bg-gradient-to-r from-red-50 to-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-sm font-semibold text-red-700">ใบหัก ณ ที่จ่าย (3%)</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        ทำงาน {daysWorked} วัน — เกิน 10 วัน ต้องหักภาษี 3%
                    </p>
                </div>
            </div>

            <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                    <span className="text-slate-500">ค่าแรงรวม</span>
                    <span className="text-slate-800">฿{totalWage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-red-500">หัก ณ ที่จ่าย 3%</span>
                    <span className="text-red-600 font-medium">-฿{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-red-100">
                    <span className="text-slate-700 font-medium">จ่ายจริง</span>
                    <span className="text-slate-900 font-bold">฿{netPayable.toLocaleString()}</span>
                </div>
            </div>

            <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
            >
                {loading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                {loading ? 'กำลังสร้าง...' : 'ดาวน์โหลดใบหัก ณ ที่จ่าย'}
            </button>
        </div>
    );
}
