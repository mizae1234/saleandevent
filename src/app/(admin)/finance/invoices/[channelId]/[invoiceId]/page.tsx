import { getInvoice, getChannelShippedItems } from "@/actions/invoice-actions";
import { InvoiceFormClient } from "../../InvoiceFormClient";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

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
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">ออกแล้ว — {invoice.invoiceNumber}</span>
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
        </div>
    );
}
