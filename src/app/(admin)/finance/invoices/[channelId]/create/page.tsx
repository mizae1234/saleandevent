import { getChannelForInvoice, getChannelShippedItems } from "@/actions/invoice-actions";
import { InvoiceFormClient } from "../../InvoiceFormClient";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default async function CreateInvoicePage({
    params,
}: {
    params: Promise<{ channelId: string }>;
}) {
    const { channelId } = await params;
    const [channel, shippedItems] = await Promise.all([
        getChannelForInvoice(channelId),
        getChannelShippedItems(channelId),
    ]);

    if (!channel) {
        return <div className="p-8 text-center text-slate-500">ไม่พบข้อมูล Event</div>;
    }

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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-teal-600" />
                    สร้าง Invoice ใหม่
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {channel.code} — {channel.name} · {channel.location}
                    {channel.customer && ` · ลูกค้า: ${channel.customer.name}`}
                </p>
            </div>

            {shippedItems.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
                    <p className="text-slate-500 text-sm">ไม่พบรายการสินค้าที่จัดส่งไปยัง Event นี้</p>
                </div>
            ) : (
                <InvoiceFormClient
                    channelId={channelId}
                    shippedItems={shippedItems}
                    channelName={`${channel.code} — ${channel.name}`}
                    customerName={channel.customer?.name}
                    defaultDiscountPercent={channel.customer?.discountPercent ? Number(channel.customer.discountPercent) : undefined}
                />
            )}
        </div>
    );
}
