import { db } from "@/lib/db";
import { format } from "date-fns";
import { ArrowLeft, Calendar, MapPin, Users, Package, Wrench, Clock, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventActions } from "./EventActions";
import { EventStatusStepper } from "./EventStatusStepper";
import { EventOperations } from "./EventOperations";
import { EventExpenses } from "./EventExpenses";

async function getEventDetails(id: string) {
    const event = await db.event.findUnique({
        where: { id },
        include: {
            staff: {
                include: {
                    staff: true
                }
            },
            requests: {
                include: {
                    items: true
                }
            },
            logs: {
                orderBy: { changedAt: 'desc' }
            },
            expenses: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    return event;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const event = await getEventDetails(id);

    if (!event) {
        notFound();
    }

    // Separate products and equipment from stock requests
    const productRequest = event.requests.find(r => r.items.some(i => i.productName));
    // Fallback logic if requests rely on order logic from previous code, but typically better to filter by type if available.
    // Previous code assumes requests[0] is product and requests[1] is equipment, which is fragile but let's stick to simple if we can't distinguish.
    // Actually, looking at `createEventWithDetails`, they are just created sequentially.
    // Let's keep the index access for now or try to make it smarter if we can distinguish.
    // The previous code used:
    const productReq = event.requests[0];
    const equipmentReq = event.requests[1];

    const statusColors: Record<string, string> = {
        draft: "bg-gray-100 text-gray-800",
        pending_approval: "bg-amber-100 text-amber-800",
        approved: "bg-green-100 text-green-800",
        packing: "bg-orange-100 text-orange-800",
        packed: "bg-teal-100 text-teal-800",
        shipped: "bg-blue-100 text-blue-800",
        in_progress: "bg-indigo-100 text-indigo-800",
        completed: "bg-purple-100 text-purple-800",
    };

    // Find Head PC name
    const headPC = event.staff.find(s => s.role === 'Head')?.staff.name;
    const responsibleName = headPC || event.responsiblePersonName || "ยังไม่ระบุ";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/events"
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-white shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{event.name}</h1>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[event.status] || statusColors.draft}`}>
                            {event.status.replace('_', ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            {event.location}
                        </span>
                        <span>•</span>
                        <span>
                            {format(new Date(event.startDate), "d MMM yyyy")} - {format(new Date(event.endDate), "d MMM yyyy")}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            ผู้รับผิดชอบ: {responsibleName}
                        </span>
                    </div>
                </div>
                {/* Edit button for draft/pending events */}
                {(event.status === 'draft' || event.status === 'pending_approval') && (
                    <Link
                        href={`/events/${event.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Pencil className="h-4 w-4" />
                        แก้ไขอีเวนท์
                    </Link>
                )}
            </div>

            {/* Stepper */}
            <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                <EventStatusStepper currentStatus={event.status} />
            </div>

            {/* Approval Actions (only for pending_approval) */}
            <EventActions eventId={event.id} status={event.status} />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Product Requests */}
                    <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                            <Package className="h-5 w-5 text-slate-400" />
                            รายการขอสินค้า
                        </h3>
                        {productReq?.items && productReq.items.length > 0 ? (
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-500">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">สินค้า</th>
                                            <th className="px-4 py-3 text-right">ขอมา</th>
                                            <th className="px-4 py-3 text-right rounded-r-lg">ส่งจริง</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productReq.items.map((item) => (
                                            <tr key={item.id} className="bg-white border-b hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-900">
                                                    <div>{item.productName}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{item.barcode} {item.size ? `• ${item.size}` : ''}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">
                                                    {item.packedQuantity !== null ? (
                                                        <span className={item.packedQuantity < item.quantity ? "text-amber-600" : "text-emerald-600"}>
                                                            {item.packedQuantity}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 rounded-lg border-2 border-dashed border-slate-200">
                                <p className="text-slate-400">ยังไม่มีรายการขอสินค้า</p>
                            </div>
                        )}
                    </div>

                    {/* Equipment Requests */}
                    {equipmentReq?.items && equipmentReq.items.length > 0 && (
                        <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                                <Wrench className="h-5 w-5 text-slate-400" />
                                อุปกรณ์ที่เบิก
                            </h3>
                            <ul className="space-y-2">
                                {equipmentReq.items.map((item) => (
                                    <li key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{item.productName}</p>
                                            <p className="text-xs text-slate-500">{item.barcode}</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-slate-500">ขอ: {item.quantity}</span>
                                            <span className="font-semibold">
                                                ส่ง: {item.packedQuantity !== null ? (
                                                    <span className={item.packedQuantity < item.quantity ? "text-amber-600" : "text-emerald-600"}>
                                                        {item.packedQuantity}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-6">
                    {/* Operations Card */}
                    <div className="h-fit">
                        <EventOperations eventId={event.id} status={event.status} />
                    </div>

                    {/* Staff List */}
                    <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                            <Users className="h-5 w-5 text-slate-400" />
                            ทีมงาน ({event.staff.length})
                        </h3>
                        {event.staff.length > 0 ? (
                            <ul className="space-y-3">
                                {event.staff.map((assignment) => (
                                    <li key={assignment.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                        <div>
                                            <p className="font-medium text-slate-900">{assignment.staff.name}</p>
                                            <p className="text-sm text-slate-500">{assignment.staff.phone || "-"}</p>
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${assignment.role === 'Head' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                                            {assignment.role === 'Head' ? 'หัวหน้าทีม' : 'PC'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 py-4">ยังไม่มีพนักงาน</p>
                        )}
                    </div>

                    {/* Expenses - New Feature */}
                    <EventExpenses eventId={event.id} expenses={event.expenses || []} />

                    {/* Event Logs */}
                    <div className="rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
                            <Clock className="h-5 w-5 text-slate-400" />
                            ประวัติล่าสุด
                        </h3>
                        {event.logs.slice(0, 5).map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="h-2 w-2 rounded-full bg-slate-300 ring-2 ring-white"></div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{log.action}</p>
                                    <p className="text-xs text-slate-500">
                                        {format(new Date(log.changedAt), "d MMM HH:mm")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
