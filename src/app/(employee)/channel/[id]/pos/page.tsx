import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanBarcode, History, PackageCheck, RefreshCw, LogOut } from "lucide-react";

export default async function EmployeePOSPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    // Validate channel access
    const isAdmin = ['ADMIN', 'MANAGER'].includes(session.role);
    if (!isAdmin) {
        const assignment = await db.channelStaff.findFirst({
            where: { channelId, staffId: session.staffId }
        });
        if (!assignment) notFound();
    }

    const channel = await db.salesChannel.findUnique({
        where: { id: channelId },
    });
    if (!channel) notFound();

    const FRONT_OFFICE_MODULES = [
        {
            title: "ขายสินค้า (POS)",
            subtitle: "เปิดระบบ POS บันทึกการขาย",
            icon: ScanBarcode,
            href: `/channel/${channelId}/pos/sell`,
            color: "from-emerald-500 to-emerald-600",
            shadowColor: "shadow-emerald-200/50",
        },
        {
            title: "รายการขาย",
            subtitle: "ดูประวัติการขายทั้งหมด",
            icon: History,
            href: `/channel/${channelId}/pos/sales`,
            color: "from-blue-500 to-blue-600",
            shadowColor: "shadow-blue-200/50",
        },
        {
            title: "รับสินค้าเข้า",
            subtitle: "รับสินค้าที่ส่งมาจากคลัง",
            icon: PackageCheck,
            href: `/channel/${channelId}/pos/receive`,
            color: "from-violet-500 to-violet-600",
            shadowColor: "shadow-violet-200/50",
        },
        {
            title: "เบิกของเพิ่ม",
            subtitle: "สร้างใบเบิกเพิ่มสต็อก",
            icon: RefreshCw,
            href: `/channel/${channelId}/pos/refill`,
            color: "from-amber-500 to-amber-600",
            shadowColor: "shadow-amber-200/50",
        },
        {
            title: "ปิดยอด/ส่งคืน",
            subtitle: "ปิดยอดขายและส่งคืนสินค้า",
            icon: LogOut,
            href: `/channel/${channelId}/pos/close`,
            color: "from-rose-500 to-rose-600",
            shadowColor: "shadow-rose-200/50",
        },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}`}
                    className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">
                        Front Office
                    </h1>
                    <p className="text-xs text-slate-400">{channel.name} — {channel.code}</p>
                </div>
            </div>

            {/* Channel Badge */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 p-4 text-white shadow-lg shadow-teal-200/50">
                <p className="text-teal-100 text-xs font-medium">ช่องทางปัจจุบัน</p>
                <p className="text-xl font-bold mt-0.5">{channel.name}</p>
                <p className="text-teal-200 text-sm">{channel.location}</p>
            </div>

            {/* Function Cards */}
            <div className="space-y-3">
                {FRONT_OFFICE_MODULES.map((mod) => {
                    const Icon = mod.icon;
                    return (
                        <Link
                            key={mod.href}
                            href={mod.href}
                            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md active:scale-[0.98] transition-all"
                        >
                            <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${mod.color} ${mod.shadowColor} shadow-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-900">{mod.title}</h4>
                                <p className="text-xs text-slate-500">{mod.subtitle}</p>
                            </div>
                            <svg className="h-5 w-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
