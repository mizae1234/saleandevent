import { getChannelsForInvoice } from "@/actions/invoice-actions";
import { InvoiceListClient } from "./InvoiceListClient";

export default async function InvoicesPage() {
    const channels = await getChannelsForInvoice();

    const serialized = channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        code: ch.code,
        location: ch.location,
        status: ch.status,
        startDate: ch.startDate?.toISOString() || null,
        endDate: ch.endDate?.toISOString() || null,
        invoiceCount: ch.invoiceCount,
        customerName: ch.customer?.name || null,
    }));

    return <InvoiceListClient channels={serialized} />;
}
