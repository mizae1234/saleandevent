'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Spinner } from '@/components/shared';
import { generateWithholdingTaxPdf, type WithholdingTaxData } from '@/lib/withholding-tax-pdf';

interface Props {
    staffName: string;
    staffCode: string;
    staffTaxId?: string;
    staffAddress?: string;
    channelName: string;
    channelCode: string;
    daysWorked: number;
    dailyRate: number;
    totalWage: number;
    commission: number;
}

const TAX_THRESHOLD_DAYS = 10;
const TAX_RATE = 0.03;

export function WithholdingTaxButton({
    staffName, staffCode, staffTaxId, staffAddress, channelName, channelCode,
    daysWorked, dailyRate, totalWage, commission,
}: Props) {
    const [loading, setLoading] = useState(false);

    const shouldWithhold = daysWorked > TAX_THRESHOLD_DAYS;
    const wageTax = shouldWithhold ? Math.round(totalWage * TAX_RATE * 100) / 100 : 0;
    const commissionTax = shouldWithhold ? Math.round(commission * TAX_RATE * 100) / 100 : 0;
    const totalIncome = totalWage + commission;
    const totalTax = wageTax + commissionTax;
    const netPayable = totalIncome - totalTax;

    const handleDownload = async () => {
        setLoading(true);
        try {
            const data: WithholdingTaxData = {
                staffName,
                staffCode,
                staffTaxId,
                staffAddress,
                channelName,
                channelCode,
                daysWorked,
                dailyRate,
                totalWage,
                commission,
                taxRate: shouldWithhold ? TAX_RATE : 0,
                wageTax,
                commissionTax,
                totalIncome,
                totalTax,
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
                        <p className="text-sm font-semibold text-slate-700">ใบหัก ณ ที่จ่าย (ภ.ง.ด.3)</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                            ทำงาน {daysWorked} วัน — ไม่เกิน 10 วัน ไม่หักภาษี 3%
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between">
                        <span className="text-slate-500">ค่าแรง (ม.40(1))</span>
                        <span className="text-slate-800">฿{totalWage.toLocaleString()}</span>
                    </div>
                    {commission > 0 && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">ค่าคอมมิสชั่น (ม.40(2))</span>
                            <span className="text-slate-800">฿{commission.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-slate-400">หัก ณ ที่จ่าย 3%</span>
                        <span className="text-slate-400">฿0</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-100">
                        <span className="text-slate-700 font-medium">จ่ายจริง</span>
                        <span className="text-slate-900 font-bold">฿{totalIncome.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm font-medium disabled:opacity-50 transition-colors shadow-sm"
                >
                    {loading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                    {loading ? 'กำลังสร้าง...' : 'ดาวน์โหลด ภ.ง.ด.3'}
                </button>
            </div>
        );
    }

    // > 10 days: 3% withholding
    return (
        <div className="bg-gradient-to-r from-red-50 to-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-sm font-semibold text-red-700">ใบหัก ณ ที่จ่าย (ภ.ง.ด.3 — 3%)</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        ทำงาน {daysWorked} วัน — เกิน 10 วัน ต้องหักภาษี 3%
                    </p>
                </div>
            </div>

            <div className="space-y-1.5 text-sm mb-4">
                {/* Wage row */}
                <div className="flex justify-between">
                    <span className="text-slate-500">ค่าแรง (ม.40(1))</span>
                    <span className="text-slate-800">฿{totalWage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pl-4">
                    <span className="text-red-400 text-xs">หัก 3%</span>
                    <span className="text-red-500 text-xs">-฿{wageTax.toLocaleString()}</span>
                </div>

                {/* Commission row */}
                {commission > 0 && (
                    <>
                        <div className="flex justify-between">
                            <span className="text-slate-500">ค่าคอมมิสชั่น (ม.40(2))</span>
                            <span className="text-slate-800">฿{commission.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pl-4">
                            <span className="text-red-400 text-xs">หัก 3%</span>
                            <span className="text-red-500 text-xs">-฿{commissionTax.toLocaleString()}</span>
                        </div>
                    </>
                )}

                {/* Total */}
                <div className="flex justify-between pt-1.5 border-t border-red-100">
                    <span className="text-slate-500">รวมเงินได้</span>
                    <span className="text-slate-800">฿{totalIncome.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-red-500 font-medium">ภาษีหัก ณ ที่จ่ายรวม</span>
                    <span className="text-red-600 font-medium">-฿{totalTax.toLocaleString()}</span>
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
                {loading ? 'กำลังสร้าง...' : 'ดาวน์โหลด ภ.ง.ด.3'}
            </button>
        </div>
    );
}
