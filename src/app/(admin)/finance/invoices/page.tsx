import { getChannelsForInvoice } from "@/actions/invoice-actions";
import Link from "next/link";
import { FileText, Search, ChevronRight } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared";

export default async function InvoicesPage() {
    const channels = await getChannelsForInvoice();

    return (
        <div className="max-w-6xl mx-auto">
            <PageHeader
                icon={FileText}
                title="ใบแจ้งหนี้ (Invoice)"
                subtitle="เลือก Event เพื่อจัดการใบแจ้งหนี้"
            />

            {/* Channel List */}
            <div className="space-y-3">
                {channels.map((ch) => (
                    <Link
                        key={ch.id}
                        href={`/finance/invoices/${ch.id}`}
                        className="block bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-teal-200 transition-all duration-200 p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700">
                                        {ch.code}
                                    </span>
                                    <h3 className="font-semibold text-slate-900 truncate">
                                        {ch.name}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span>{ch.location}</span>
                                    {ch.customer && (
                                        <span className="flex items-center gap-1">
                                            ลูกค้า: <span className="font-medium text-slate-700">{ch.customer.name}</span>
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        Invoice: <span className="font-medium text-slate-700">{ch.invoiceCount} รายการ</span>
                                    </span>
                                </div>
                                {ch.startDate && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(ch.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        {ch.endDate && ` — ${new Date(ch.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        </div>
                    </Link>
                ))}

                {channels.length === 0 && (
                    <EmptyState
                        icon={FileText}
                        message="ยังไม่มี Event ที่มีการจัดส่งสินค้า"
                        description="เมื่อมีการจัดส่งสินค้าไปยัง Event แล้ว จะแสดงที่นี่"
                        className="py-12"
                    />
                )}
            </div>
        </div>
    );
}
