'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Spinner } from '@/components/shared';
import { generateWithholdingTaxPdf, type WithholdingTaxData } from '@/lib/withholding-tax-pdf';
import { calculatePayrollTax } from '@/lib/expense-tax';

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
    setupExpense?: number;
    teardownExpense?: number;
    targetIncentive?: number;
    expenses?: { category: string; amount: number; whtType?: string | null }[];
}

export function WithholdingTaxButton({
    staffName, staffCode, staffTaxId, staffAddress, channelName, channelCode,
    daysWorked, dailyRate, totalWage, commission,
    setupExpense = 0, teardownExpense = 0, targetIncentive = 0, expenses = [],
}: Props) {
    const [loading, setLoading] = useState(false);

    // Dynamic calculation based on Master whtType
    const taxResult = calculatePayrollTax({
        daysWorked,
        dailyRate,
        commission,
        expenses: expenses.length > 0 ? expenses : [
            ...(setupExpense ? [{ category: 'ค่าลงงาน', amount: setupExpense, whtType: '40_1' }] : []),
            ...(teardownExpense ? [{ category: 'ค่าเก็บงาน', amount: teardownExpense, whtType: '40_1' }] : []),
            ...(targetIncentive ? [{ category: 'ค่าเป้า', amount: targetIncentive, whtType: '40_2' }] : []),
        ],
    });

    const shouldWithholdWage = daysWorked > 10;
    const hasTax = taxResult.totalWithholdingTax > 0;
    const resolvedSetup = setupExpense || (expenses.find(e => e.category === 'ค่าลงงาน')?.amount || 0);
    const resolvedTeardown = teardownExpense || (expenses.find(e => e.category === 'ค่าเก็บงาน')?.amount || 0);
    const resolvedTarget = targetIncentive || (expenses.find(e => e.category === 'ค่าเป้า')?.amount || 0);

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
                totalWage: taxResult.baseWage,
                setupExpense: resolvedSetup,
                teardownExpense: resolvedTeardown,
                wage401Total: taxResult.total401,
                commission: taxResult.commission,
                targetIncentive: resolvedTarget,
                commission402Total: taxResult.total402,
                taxRate: 0.03,
                wageTax: taxResult.wageTax,
                commissionTax: taxResult.commissionTax,
                totalIncome: taxResult.total401 + taxResult.total402,
                totalTax: taxResult.totalWithholdingTax,
                netPayable: (taxResult.total401 + taxResult.total402) - taxResult.totalWithholdingTax,
                documentDate: new Date().toISOString(),
            };
            await generateWithholdingTaxPdf(data);
        } catch (err) {
            console.error('Failed to generate WHT PDF:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`rounded-xl border p-5 ${hasTax ? 'bg-gradient-to-r from-red-50 to-white border-red-200' : 'bg-gradient-to-r from-slate-50 to-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className={`text-sm font-semibold ${hasTax ? 'text-red-700' : 'text-slate-700'}`}>
                        ใบหัก ณ ที่จ่าย (ภ.ง.ด.3 {hasTax ? '— 3%' : ''})
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        ทำงาน {daysWorked} วัน {shouldWithholdWage ? '(เกิน 10 วัน หัก ม.40(1) 3%)' : '(ไม่เกิน 10 วัน ยกเว้นภาษี ม.40(1))'}
                    </p>
                </div>
            </div>

            <div className="space-y-2 text-sm mb-4">
                {/* 40(1) Group */}
                <div className="pb-2 border-b border-slate-100">
                    <div className="flex justify-between font-medium text-slate-700">
                        <span>เงินได้ ม.40(1) (ค่าแรง + ค่าลง/เก็บของ)</span>
                        <span>฿{taxResult.total401.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-400 pl-2 mt-0.5 space-y-0.5">
                        <div className="flex justify-between">
                            <span>• ค่าแรง ({daysWorked} วัน × ฿{dailyRate.toLocaleString()})</span>
                            <span>฿{taxResult.baseWage.toLocaleString()}</span>
                        </div>
                        {taxResult.additional401 > 0 && (
                            <div className="flex justify-between">
                                <span>• ค่าลงงาน / ค่าเก็บงาน</span>
                                <span>฿{taxResult.additional401.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between text-xs mt-1 pl-2">
                        <span className={shouldWithholdWage ? 'text-red-500' : 'text-slate-400'}>
                            {shouldWithholdWage ? 'หัก ณ ที่จ่าย ม.40(1) (3%)' : 'หัก 0% (ทำงาน ≤ 10 วัน)'}
                        </span>
                        <span className={shouldWithholdWage ? 'text-red-600 font-medium' : 'text-slate-400'}>
                            {shouldWithholdWage ? `-฿${taxResult.wageTax.toLocaleString()}` : '฿0'}
                        </span>
                    </div>
                </div>

                {/* 40(2) Group */}
                {taxResult.total402 > 0 && (
                    <div className="pb-2 border-b border-slate-100">
                        <div className="flex justify-between font-medium text-slate-700">
                            <span>เงินได้ ม.40(2) (ค่าคอมมิสชั่น + ค่าเป้า)</span>
                            <span>฿{taxResult.total402.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-400 pl-2 mt-0.5 space-y-0.5">
                            {taxResult.commission > 0 && (
                                <div className="flex justify-between">
                                    <span>• ค่าคอมมิสชั่น</span>
                                    <span>฿{taxResult.commission.toLocaleString()}</span>
                                </div>
                            )}
                            {taxResult.additional402 > 0 && (
                                <div className="flex justify-between">
                                    <span>• ค่าเป้า</span>
                                    <span>฿{taxResult.additional402.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between text-xs mt-1 pl-2">
                            <span className="text-red-500">หัก ณ ที่จ่าย ม.40(2) (3%)</span>
                            <span className="text-red-600 font-medium">-฿{taxResult.commissionTax.toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Total Summary */}
                <div className="flex justify-between pt-1 text-slate-600">
                    <span>รวมเงินได้ที่คิดภาษี</span>
                    <span>฿{(taxResult.total401 + taxResult.total402).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium text-red-600">
                    <span>รวมภาษีหัก ณ ที่จ่าย (3%)</span>
                    <span>-฿{taxResult.totalWithholdingTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                    <span className="text-slate-800 font-semibold">ยอดจ่ายสุทธิส่วนนี้</span>
                    <span className="text-slate-900 font-bold">
                        ฿{((taxResult.total401 + taxResult.total402) - taxResult.totalWithholdingTax).toLocaleString()}
                    </span>
                </div>
            </div>

            <button
                onClick={handleDownload}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shadow-sm text-white ${hasTax ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}
            >
                {loading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
                {loading ? 'กำลังสร้างเอกสาร...' : 'ดาวน์โหลด ใบหัก ณ ที่จ่าย (ภ.ง.ด.3)'}
            </button>
        </div>
    );
}
