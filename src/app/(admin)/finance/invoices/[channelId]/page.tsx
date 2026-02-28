import { getInvoicesByChannel, getChannelForInvoice } from "@/actions/invoice-actions";
import Link from "next/link";
import { FileText, Plus, ArrowLeft, ChevronRight } from "lucide-react";
import { DeleteInvoiceButton } from "../DeleteInvoiceButton";
import { InvoicePdfButton } from "../InvoicePdfButton";

export default async function ChannelInvoicesPage({
    params,
}: {
    params: Promise<{ channelId: string }>;
}) {
    const { channelId } = await params;
    const [channel, invoices] = await Promise.all([
        getChannelForInvoice(channelId),
        getInvoicesByChannel(channelId),
    ]);

    if (!channel) {
        return <div className="p-8 text-center text-slate-500">ไม่พบข้อมูล Event</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back */}
            <Link
                href="/finance/invoices"
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับรายการ Event
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-teal-600" />
                        Invoice — {channel.name}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        <span className="font-medium">{channel.code}</span> · {channel.location}
                        {channel.customer && ` · ลูกค้า: ${channel.customer.name}`}
                    </p>
                </div>
                <Link
                    href={`/finance/invoices/${channelId}/create`}
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    สร้าง Invoice
                </Link>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-3 text-xs font-semibold text-slate-600">เลข Invoice</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">วันที่</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">%</th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">จำนวนรวม</th>
                                <th className="text-right p-3 text-xs font-semibold text-slate-600">ยอดรวม (฿)</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600">สถานะ</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-12">PDF</th>
                                <th className="text-center p-3 text-xs font-semibold text-slate-600 w-20">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3">
                                        <Link
                                            href={`/finance/invoices/${channelId}/${inv.id}`}
                                            className="font-semibold text-teal-700 hover:text-teal-800"
                                        >
                                            {inv.invoiceNumber || '(ฉบับร่าง)'}
                                        </Link>
                                    </td>
                                    <td className="p-3 text-center text-slate-600">
                                        {inv.invoiceDate
                                            ? new Date(inv.invoiceDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                                            : '-'}
                                    </td>
                                    <td className="p-3 text-center text-slate-600">
                                        {Number(inv.invoicePercent)}%
                                    </td>
                                    <td className="p-3 text-right text-slate-900 font-medium">
                                        {inv.totalQuantity.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right text-slate-900 font-medium">
                                        {Number(inv.totalAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-center">
                                        {inv.status === 'draft' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                ฉบับร่าง
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                ออกแล้ว
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <InvoicePdfButton invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Link
                                                href={`/finance/invoices/${channelId}/${inv.id}`}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                                title="ดูรายละเอียด"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                            {inv.status === 'draft' && (
                                                <DeleteInvoiceButton id={inv.id} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                                        ยังไม่มี Invoice สำหรับ Event นี้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
