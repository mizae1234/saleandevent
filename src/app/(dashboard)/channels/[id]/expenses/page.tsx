import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Receipt, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventExpenses } from "../EventExpenses";
import { EventCompensation } from "../EventCompensation";

async function getEventDetails(id: string) {
    const event = await db.salesChannel.findUnique({
        where: { id },
        include: {
            staff: {
                include: {
                    staff: true
                }
            },
            expenses: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    return event;
}

export default async function EventExpensePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventDetails(id);

    if (!event) {
        notFound();
    }

    const statusColors: Record<string, string> = {
        draft: "bg-gray-100 text-gray-800",
        pending_approval: "bg-amber-100 text-amber-800",
        approved: "bg-green-100 text-green-800",
        packing: "bg-orange-100 text-orange-800",
        packed: "bg-teal-100 text-teal-800",
        shipped: "bg-blue-100 text-blue-800",
        in_progress: "bg-indigo-100 text-indigo-800",
        completed: "bg-purple-100 text-purple-800",
        pending_return: "bg-red-100 text-red-800",
        returning: "bg-orange-100 text-orange-800",
        returned: "bg-emerald-100 text-emerald-800",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/channels/expenses"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">จัดการค่าใช้จ่าย & ค่าตอบแทน</h1>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[event.status] || "bg-gray-100"}`}>
                            {event.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="text-slate-600 font-medium">{event.name}</div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                        </span>
                        <span>•</span>
                        <span>
                            {format(new Date(event.startDate!), "d MMM yyyy")} - {format(new Date(event.endDate!), "d MMM yyyy")}
                        </span>
                    </div>
                </div>
                <Link
                    href={`/channels/${event.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    กลับไปหน้ารายละเอียด Event
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column: Expenses */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Receipt className="h-5 w-5 text-slate-500" />
                        บันทึกค่าใช้จ่าย
                    </div>
                    <EventExpenses channelId={event.id} expenses={event.expenses || []} />
                </div>

                {/* Right Column: Compensation */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <Users className="h-5 w-5 text-slate-500" />
                        สรุปค่าตอบแทนทีมงาน
                    </div>
                    <EventCompensation channelId={event.id} />
                </div>
            </div>
        </div>
    );
}
