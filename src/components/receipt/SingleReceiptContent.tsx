"use client";

import { SingleReceiptData } from "@/actions/receipt-actions";

interface Props {
    data: SingleReceiptData;
    widthMode: "80mm" | "58mm";
}

export function SingleReceiptContent({ data, widthMode }: Props) {
    const is58 = widthMode === "58mm";
    const { company, channel, sale } = data;

    // Formatting money
    const fmt = (n: number) =>
        n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div
            id="thermal-receipt-printable"
            className={`bg-white text-slate-900 mx-auto select-none font-sans leading-tight ${
                is58
                    ? "w-[240px] text-[11px] p-3 space-y-2.5"
                    : "w-[330px] text-[13px] p-5 space-y-3.5"
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
            <div className={`space-y-0.5 border-t border-dashed border-slate-300 pt-2 ${is58 ? "text-[10px]" : "text-xs"}`}>
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

            {/* 4. RECEIPT HEADER */}
            <div className="text-center border-t border-dashed border-slate-300 pt-2">
                <p className={`font-bold tracking-wide text-slate-900 ${is58 ? "text-xs" : "text-sm"}`}>
                    ใบเสร็จรับเงิน
                </p>
                <p className={`font-semibold tracking-widest text-slate-500 uppercase ${is58 ? "text-[9px]" : "text-[10px]"}`}>
                    RECEIPT
                </p>
            </div>

            <div className={`space-y-0.5 ${is58 ? "text-[10px]" : "text-xs"}`}>
                <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่บิล</span>
                    <span className="font-mono font-bold text-slate-900">{sale.billCode}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">วันที่ / เวลา</span>
                    <span className="font-medium text-slate-800">{sale.soldAtFormatted}</span>
                </div>
            </div>

            {/* 5. ITEM LIST TABLE */}
            <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-2">
                <div className={`flex justify-between text-slate-500 font-semibold border-b border-dashed border-slate-200 pb-1 ${is58 ? "text-[9px]" : "text-[11px]"}`}>
                    <span>รายการ</span>
                    <span>จำนวนเงิน</span>
                </div>

                <div className="space-y-2">
                    {sale.items.map((item) => (
                        <div key={item.id} className="space-y-0.5">
                            {/* Line 1: Code & Name */}
                            <div className="flex items-baseline justify-between font-medium text-slate-900">
                                <span className="truncate pr-2">
                                    {item.code ? `${item.code} ` : ""}{item.name}
                                </span>
                            </div>
                            {/* Line 2: Attributes + Qty x Price & Total */}
                            <div className={`flex items-baseline justify-between text-slate-600 ${is58 ? "text-[9.5px]" : "text-xs"}`}>
                                <span className="text-slate-500 truncate pr-2">
                                    {[item.color, item.size].filter(Boolean).join(" • ")}
                                    {[item.color, item.size].some(Boolean) ? " • " : ""}
                                    {item.quantity} x {fmt(item.unitPrice)}
                                </span>
                                <span className="font-mono font-semibold text-slate-900 shrink-0">
                                    {fmt(item.totalAmount)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. TOTALS & SUMMARY */}
            <div className={`space-y-1 ${is58 ? "text-[10px]" : "text-xs"}`}>
                <div className="flex justify-between">
                    <span className="text-slate-600">รวมเป็นเงิน ({sale.totalItems} ชิ้น)</span>
                    <span className="font-mono font-medium">{fmt(sale.subtotal)}</span>
                </div>

                {sale.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                        <span>ส่วนลดท้ายบิล</span>
                        <span className="font-mono font-medium">-{fmt(sale.discount)}</span>
                    </div>
                )}

                <div className="border-t border-b border-slate-900 py-1.5 flex justify-between items-baseline my-1">
                    <span className={`font-bold text-slate-900 ${is58 ? "text-xs" : "text-sm"}`}>ยอดสุทธิ</span>
                    <span className={`font-mono font-extrabold text-slate-900 ${is58 ? "text-sm" : "text-base"}`}>
                        ฿{fmt(sale.grandTotal)}
                    </span>
                </div>

                <div className="pt-0.5 space-y-0.5 text-slate-700">
                    <div className="flex justify-between">
                        <span className="text-slate-500">ชำระโดย</span>
                        <span className="font-semibold text-slate-900">{sale.paymentMethodLabel}</span>
                    </div>
                    {sale.receivedAmount !== null && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">รับเงิน</span>
                            <span className="font-mono font-medium">{fmt(sale.receivedAmount)}</span>
                        </div>
                    )}
                    {sale.changeAmount !== null && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">เงินทอน</span>
                            <span className="font-mono font-medium">{fmt(sale.changeAmount)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 7. FOOTER */}
            <div className={`text-center border-t border-dashed border-slate-300 pt-3 space-y-1 text-slate-500 ${is58 ? "text-[9px]" : "text-[11px]"}`}>
                {company.footerNote ? (
                    <div className="whitespace-pre-line leading-relaxed">{company.footerNote}</div>
                ) : (
                    <>
                        <p className="font-semibold text-slate-800">ขอบคุณที่อุดหนุน {company.name}</p>
                        <p className="text-[10px] text-slate-400">Thank you for shopping with us</p>
                    </>
                )}
            </div>
        </div>
    );
}
