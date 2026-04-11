import { getInvoice } from "@/actions/invoice-actions";
import { getCreditNote } from "@/actions/credit-note-actions";
import { CreditNoteClient } from "../../CreditNoteClient";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";

export default async function EditCreditNotePage({
    params,
}: {
    params: Promise<{ channelId: string; invoiceId: string; cnId: string }>;
}) {
    const { channelId, invoiceId, cnId } = await params;
    const invoice = await getInvoice(invoiceId);
    const creditNote = await getCreditNote(cnId);

    if (!invoice) {
        return <div className="p-8 text-center text-slate-500">ไม่พบ Invoice</div>;
    }

    if (!creditNote) {
        return <div className="p-8 text-center text-rose-500">ไม่พบข้อมูลใบลดหนี้ อ้างอิงนี้</div>;
    }

    const existingAllocations: Record<string, number> = {};
    for (const item of creditNote.items) {
        if (item.invoiceItemId) {
            existingAllocations[item.invoiceItemId] = item.quantity;
        }
    }

    const usedQtyMap = new Map<string, number>();
    let totalDeducted = 0;
    if (invoice.creditNotes) {
        for (const cn of invoice.creditNotes) {
            // Exclude current CN from deductions so the admin can move quantities cleanly
            if (cn.id === cnId) continue;
            totalDeducted += Number(cn.totalAmount);
            for (const cnItem of cn.items) {
                if (cnItem.invoiceItemId) {
                    usedQtyMap.set(
                        cnItem.invoiceItemId, 
                        (usedQtyMap.get(cnItem.invoiceItemId) || 0) + cnItem.quantity
                    );
                }
            }
        }
    }

    const displayItems = invoice.items.map((item: any) => {
        const used = usedQtyMap.get(item.id) || 0;
        return {
            id: item.id,
            barcode: item.barcode,
            unitPrice: Number(item.unitPrice),
            invoiceQty: item.invoiceQty,
            availableQty: Math.max(0, item.invoiceQty - used),
            productName: item.product.productName || item.product.name,
            color: item.product.color,
            size: item.product.size
        };
    }).filter(item => item.availableQty > 0 || (existingAllocations[item.id] && existingAllocations[item.id] > 0));

    return (
        <div className="max-w-6xl mx-auto">
            {/* Back */}
            <Link
                href={`/finance/invoices/${channelId}/${invoice.id}`}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-amber-600 mb-4 transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับหน้า Invoice
            </Link>

            {/* Header */}
            <div className="mb-6 pb-6 border-b border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Edit className="h-6 w-6 text-amber-600" />
                    แก้ไขใบลดหนี้ (Credit Note): {creditNote.cnNumber}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    อ้างอิงบิล {invoice.invoiceNumber} — {invoice.customer?.name ? `ลูกค้า: ${invoice.customer.name}` : `ช่องทาง: ${invoice.channel.name}`}
                </p>
            </div>

            <CreditNoteClient 
                invoiceId={invoice.id}
                initialCnNumber={creditNote.cnNumber || ''}
                invoiceItems={displayItems}
                grandTotal={Number(invoice.grandTotal)}
                netTotal={Number(invoice.grandTotal) - totalDeducted}
                isEdit={true}
                existingCnId={creditNote.id}
                existingAllocations={existingAllocations}
                existingReason={creditNote.reason || ''}
                existingTargetAmount={Number(creditNote.totalAmount)}
            />
        </div>
    );
}
