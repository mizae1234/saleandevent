import { getInvoice, getChannelShippedItems } from "@/actions/invoice-actions";
import { InvoiceFormClient } from "../../InvoiceFormClient";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, FileMinus, Edit } from "lucide-react";
import { EditInvoiceNumber } from "./EditInvoiceNumber";
import { CreditNotePdfButton } from "../../CreditNotePdfButton";
import { DeleteCreditNoteButton } from "../../DeleteCreditNoteButton";

export default async function InvoiceDetailPage({
    params,
}: {
    params: Promise<{ channelId: string; invoiceId: string }>;
}) {
    const { channelId, invoiceId } = await params;
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
        return <div className="p-8 text-center text-slate-500">ไม่พบ Invoice</div>;
    }

    // For editing, also fetch shipped items to know originals
    const shippedItems = await getChannelShippedItems(channelId);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back */}
            <Link
                href={`/finance/invoices/${channelId}`}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับรายการ Invoice
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="h-6 w-6 text-teal-600" />
                        {invoice.invoiceNumber || 'Invoice (ฉบับร่าง)'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {invoice.channel.code} — {invoice.channel.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {invoice.status === 'submitted' ? (
                        <div className="flex items-center gap-3">
                            <Link 
                                href={`/finance/invoices/${channelId}/${invoice.id}/credit-note`}
                                className="flex items-center gap-2 px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100 transition-colors shadow-sm text-sm font-medium"
                            >
                                <FileMinus className="h-4 w-4" />
                                ออกใบลดหนี้ (CN)
                            </Link>
                            <EditInvoiceNumber
                                invoiceId={invoice.id}
                                currentNumber={invoice.invoiceNumber || ''}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                            <span className="text-sm font-medium">ฉบับร่าง — ยังไม่ออกเลข</span>
                        </div>
                    )}
                </div>
            </div>

            <InvoiceFormClient
                channelId={channelId}
                shippedItems={shippedItems}
                existingInvoice={{
                    id: invoice.id,
                    invoicePercent: Number(invoice.invoicePercent),
                    discountPercent: Number(invoice.discountPercent),
                    notes: invoice.notes,
                    invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toISOString() : null,
                    status: invoice.status,
                    items: invoice.items.map((item: any) => ({
                        barcode: item.barcode,
                        originalQty: item.originalQty,
                        invoiceQty: item.invoiceQty,
                        unitPrice: Number(item.unitPrice),
                        product: item.product,
                    })),
                }}
                channelName={`${invoice.channel.code} — ${invoice.channel.name}`}
                customerName={invoice.customer?.name}
            />

            {invoice.creditNotes && invoice.creditNotes.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileMinus className="h-5 w-5 text-rose-500" />
                            ประวัติใบลดหนี้ (Credit Notes)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                    <th className="pb-3 pt-3 px-6 font-medium">เลขที่อ้างอิง (CN)</th>
                                    <th className="pb-3 pt-3 px-6 font-medium">วันที่ทำรายการ</th>
                                    <th className="pb-3 pt-3 px-6 font-medium">เหตุผล</th>
                                    <th className="pb-3 pt-3 px-6 font-medium text-right">ยอดลดหนี้ (฿)</th>
                                    <th className="pb-3 pt-3 px-6 font-medium text-center w-36">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-slate-100">
                                {invoice.creditNotes.map((cn: any) => (
                                    <tr key={cn.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-6 font-medium text-slate-900">{cn.cnNumber}</td>
                                        <td className="py-3 px-6 text-slate-500">
                                            {new Date(cn.createdAt).toLocaleDateString('th-TH')}
                                        </td>
                                        <td className="py-3 px-6 text-slate-600">{cn.reason || '-'}</td>
                                        <td className="py-3 px-6 text-right font-bold text-rose-600">
                                            {Number(cn.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-6">
                                            <div className="flex items-center justify-center gap-1">
                                                <CreditNotePdfButton cnId={cn.id} cnNumber={cn.cnNumber} />
                                                <Link
                                                    href={`/finance/invoices/${channelId}/${invoice.id}/credit-note/${cn.id}/edit`}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors relative group"
                                                    title="แก้ไขใบลดหนี้"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                                <DeleteCreditNoteButton cnId={cn.id} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
