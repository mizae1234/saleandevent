import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventSalesClient } from "@/app/(admin)/pc/sales/channel/[id]/EventSalesClient";

export default async function EmployeeSalesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const event = await db.salesChannel.findUnique({
        where: { id: channelId },
        include: {
            sales: {
                include: {
                    items: {
                        include: {
                            product: {
                                select: { name: true, code: true }
                            }
                        }
                    }
                },
                orderBy: { soldAt: 'desc' }
            }
        }
    });

    if (!event) notFound();

    return (
        <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}/pos`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-base font-bold text-slate-900">รายการขาย</h1>
                    <p className="text-xs text-slate-400">{event.name} — {event.code}</p>
                </div>
            </div>

            <EventSalesClient
                event={{
                    id: event.id,
                    name: event.name,
                    code: event.code,
                    location: event.location || ''
                }}
                sales={event.sales as any}
                backHref={`/channel/${channelId}/pos`}
            />
        </div>
    );
}
