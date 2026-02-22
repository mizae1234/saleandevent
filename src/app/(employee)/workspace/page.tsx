import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MapPin, Calendar, ShoppingCart, Users } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

async function getAssignedChannels(staffId: string) {
    const assignments = await db.channelStaff.findMany({
        where: { staffId },
        include: {
            channel: {
                include: {
                    stock: true,
                }
            }
        },
        orderBy: { channel: { startDate: 'desc' } }
    });

    return assignments
        .filter(a => a.channel.status === 'active' || a.channel.status === 'approved')
        .map(a => a.channel);
}

export default async function WorkspacePage() {
    const session = await getSession();
    if (!session) redirect('/login');

    const channels = await getAssignedChannels(session.staffId);

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    สวัสดี, {session.name} 👋
                </h1>
                <p className="text-slate-500 mt-1">เลือกช่องทางที่ต้องการทำงาน</p>
            </div>

            {/* Channel Cards */}
            <div className="space-y-3">
                {channels.map((channel) => {
                    const totalStock = channel.stock.reduce((sum, s) => sum + s.quantity, 0);
                    const totalSold = channel.stock.reduce((sum, s) => sum + (s.soldQuantity || 0), 0);

                    return (
                        <Link
                            key={channel.id}
                            href={`/channel/${channel.id}`}
                            className="block rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-all border border-slate-100 active:scale-[0.98]"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-lg">{channel.name}</h3>
                                    <span className="text-xs font-mono text-slate-400">{channel.code}</span>
                                </div>
                                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                                    {channel.status}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-sm text-slate-500 mb-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    <span>{channel.location}</span>
                                </div>
                                {channel.startDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span>
                                            {format(new Date(channel.startDate), "d MMM")}
                                            {channel.endDate && ` — ${format(new Date(channel.endDate), "d MMM")}`}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Stock mini bar */}
                            {totalStock > 0 && (
                                <div className="bg-slate-50 rounded-lg p-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">ขายแล้ว</span>
                                        <span className="font-medium text-slate-700">{totalSold} / {totalStock}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-teal-500 rounded-full"
                                            style={{ width: `${(totalSold / totalStock) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Empty State */}
            {channels.length === 0 && (
                <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100">
                    <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="font-semibold text-slate-900 mb-1">ยังไม่มีช่องทางที่ถูกมอบหมาย</h3>
                    <p className="text-sm text-slate-500">กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มคุณเข้า Event</p>
                </div>
            )}
        </div>
    );
}
