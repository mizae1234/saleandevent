"use client";

import { DailySummaryData } from "@/actions/receipt-actions";

interface Props {
    data: DailySummaryData;
    widthMode: "80mm" | "58mm";
}

export function DailySummaryContent({ data, widthMode }: Props) {
    const is58 = widthMode === "58mm";
    const { company, channel, summary } = data;

    const fmt = (n: number) =>
        n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div
            id="thermal-receipt-printable"
            className={`bg-white text-slate-900 mx-auto select-none font-sans leading-tight ${
                is58
                    ? "w-[240px] text-[10.5px] p-3 space-y-2.5"
                    : "w-[330px] text-[12.5px] p-5 space-y-3.5"
            }`}
            style={{
                fontFamily: "'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
            {/* 1. LOGO */}
            <div className="text-center space-y-1">
                {company.logoUrl ? (
                    <div className="flex justify-center">
                        <img
                            src={company.logoUrl}
                            alt={company.name}
                            className={`object-contain max-h-16 ${is58 ? "max-w-[150px]" : "max-w-[200px]"}`}
                        />
                    </div>
                ) : (
                    <div className="font-extrabold tracking-widest text-2xl font-serif">
                        {company.name}
                    </div>
                )}
            </div>

            {/* 2. STORE & EVENT INFO */}
            <div className="text-center space-y-0.5 pt-1">
                <p className={`font-bold text-slate-900 ${is58 ? "text-xs" : "text-sm"}`}>
                    {channel.location || channel.name}
                </p>
                {channel.location && channel.name && channel.location !== channel.name && (
                    <p className={`text-slate-600 ${is58 ? "text-[10px]" : "text-xs"}`}>
                        {channel.name}
                    </p>
                )}
            </div>

            {/* 3. EVENT META */}
            <div className={`space-y-0.5 border-t border-dashed border-slate-300 pt-2 ${is58 ? "text-[9.5px]" : "text-xs"}`}>
                <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่จุดขาย</span>
                    <span className="font-medium text-slate-800">{channel.code}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">วันที่จัดรายการ</span>
                    <span className="font-medium text-slate-800">{channel.dateRange}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">พนักงาน</span>
                    <span className="font-medium text-slate-800 truncate max-w-[160px] text-right">{channel.staffName || "-"}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">หัวหน้า</span>
                    <span className="font-medium text-slate-800 truncate max-w-[160px] text-right">-</span>
                </div>
            </div>

            {/* 4. SUMMARY TITLE */}
            <div className="text-center border-t border-dashed border-slate-300 pt-2 space-y-0.5">
                <p className={`font-bold tracking-wide text-slate-900 ${is58 ? "text-xs" : "text-sm"}`}>
                    สรุปยอดขายประจำวัน
                </p>
                <p className={`font-semibold tracking-widest text-slate-500 uppercase ${is58 ? "text-[8.5px]" : "text-[10px]"}`}>
                    DAILY SALES SUMMARY
                </p>
                <p className={`font-medium text-slate-800 ${is58 ? "text-[10px]" : "text-xs"}`}>
                    วันที่ {summary.dateFormatted} (วันที่ {summary.dayNumber} ของงาน)
                </p>
                <p className={`text-slate-400 ${is58 ? "text-[8px]" : "text-[10px]"}`}>
                    พิมพ์เมื่อ {summary.printedAtFormatted}
                </p>
            </div>

            {/* 5. TABLE 1: PAYMENT METHOD BREAKDOWN */}
            <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1.5">
                <p className={`font-bold text-slate-900 ${is58 ? "text-[10px]" : "text-xs"}`}>
                    ยอดขายแยกตามช่องทางชำระ
                </p>
                <table className="w-full text-left">
                    <thead>
                        <tr className={`border-b border-dashed border-slate-200 text-slate-500 ${is58 ? "text-[9px]" : "text-[11px]"}`}>
                            <th className="font-semibold py-1">ช่องทาง</th>
                            <th className="font-semibold text-right py-1">บิล</th>
                            <th className="font-semibold text-right py-1">ชิ้น</th>
                            <th className="font-semibold text-right py-1">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-100">
                        {summary.paymentBreakdown.map((pm) => (
                            <tr key={pm.method} className={is58 ? "text-[9.5px]" : "text-xs"}>
                                <td className="py-1 text-slate-800">{pm.label}</td>
                                <td className="py-1 text-right font-mono text-slate-600">{pm.bills}</td>
                                <td className="py-1 text-right font-mono text-slate-600">{pm.items}</td>
                                <td className="py-1 text-right font-mono text-slate-900 font-medium">{fmt(pm.amount)}</td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className={`font-bold border-t border-slate-300 ${is58 ? "text-[10px]" : "text-xs"}`}>
                            <td className="py-1 text-slate-900">รวมทั้งวัน</td>
                            <td className="py-1 text-right font-mono">{summary.totalBills}</td>
                            <td className="py-1 text-right font-mono">{summary.totalItems}</td>
                            <td className="py-1 text-right font-mono text-slate-900">{fmt(summary.totalAmount)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 6. TOTALS & DISCOUNT */}
            <div className={`space-y-1 ${is58 ? "text-[10px]" : "text-xs"}`}>
                <div className="flex justify-between">
                    <span className="text-slate-600">ยอดขายก่อนส่วนลด</span>
                    <span className="font-mono font-medium">{fmt(summary.grossAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                    <span>ส่วนลดท้ายบิลรวม ({summary.discountBillCount} บิล)</span>
                    <span className="font-mono font-medium">-{fmt(summary.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                    <span>บิลยกเลิก</span>
                    <span className="font-mono font-medium">{summary.cancelledBillCount} บิล</span>
                </div>

                {/* Highlighted Net Total Today */}
                <div className="border-t-2 border-b-2 border-slate-900 py-1.5 flex justify-between items-baseline my-1 bg-slate-50/50 px-1">
                    <span className={`font-bold text-slate-900 ${is58 ? "text-xs" : "text-sm"}`}>ยอดขายสุทธิวันนี้</span>
                    <span className={`font-mono font-extrabold text-slate-900 ${is58 ? "text-sm" : "text-base"}`}>
                        ฿{fmt(summary.netToday)}
                    </span>
                </div>
            </div>

            {/* 7. TABLE 2: CUMULATIVE SALES */}
            {summary.cumulativeDays && summary.cumulativeDays.length > 0 && (
                <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1.5">
                    <p className={`font-bold text-slate-900 ${is58 ? "text-[10px]" : "text-xs"}`}>
                        ยอดขายสะสมตั้งแต่เริ่มงาน
                    </p>
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`border-b border-dashed border-slate-200 text-slate-500 ${is58 ? "text-[9px]" : "text-[10.5px]"}`}>
                                <th className="font-semibold py-1">วันที่</th>
                                <th className="font-semibold text-right py-1">บิล</th>
                                <th className="font-semibold text-right py-1">ชิ้น</th>
                                <th className="font-semibold text-right py-1">ยอดขาย</th>
                                <th className="font-semibold text-right py-1">สะสม</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dashed divide-slate-100">
                            {summary.cumulativeDays.map((row) => (
                                <tr key={row.dateShort} className={is58 ? "text-[9px]" : "text-[11.5px]"}>
                                    <td className="py-0.5 font-mono text-slate-700">{row.dateShort}</td>
                                    <td className="py-0.5 text-right font-mono text-slate-600">{row.bills}</td>
                                    <td className="py-0.5 text-right font-mono text-slate-600">{row.items}</td>
                                    <td className="py-0.5 text-right font-mono text-slate-700">{fmt(row.sales)}</td>
                                    <td className="py-0.5 text-right font-mono font-semibold text-slate-900">{fmt(row.cumulative)}</td>
                                </tr>
                            ))}
                            {/* Cumulative Summary Row */}
                            <tr className={`font-bold border-t border-slate-300 text-slate-900 ${is58 ? "text-[9.5px]" : "text-[11.5px]"}`}>
                                <td colSpan={3} className="py-1">
                                    รวม {summary.cumulativeTotals.bills} บิล - {summary.cumulativeTotals.items} ชิ้น
                                </td>
                                <td colSpan={2} className="py-1 text-right font-mono">
                                    {fmt(summary.cumulativeTotals.sales)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* 8. SIGNATURES */}
            <div className={`pt-4 ${is58 ? "space-y-4" : "grid grid-cols-2 gap-4"} text-center`}>
                <div className="space-y-1">
                    <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
                    <p className={`text-slate-600 font-medium ${is58 ? "text-[9px]" : "text-[10px]"}`}>
                        พนักงานขาย {summary.signatures.staff && summary.signatures.staff !== '-' ? `(${summary.signatures.staff.replace(/^.*?\((.*?)\).*$/, "$1") || summary.signatures.staff})` : ''}
                    </p>
                </div>
                <div className="space-y-1">
                    <div className="border-b border-slate-400 w-3/4 mx-auto pb-6" />
                    <p className={`text-slate-600 font-medium ${is58 ? "text-[9px]" : "text-[10px]"}`}>
                        หัวหน้า / ผู้ตรวจสอบ {summary.signatures.manager && summary.signatures.manager !== '-' ? `(${summary.signatures.manager.replace(/^.*?\((.*?)\).*$/, "$1") || summary.signatures.manager})` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
