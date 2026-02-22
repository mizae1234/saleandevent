import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewRefillClient from "@/app/(admin)/pc/refill/new/NewRefillClient";

export default async function EmployeeRefillNewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: channelId } = await params;
    const session = await getSession();
    if (!session) redirect('/login');

    const channel = await db.salesChannel.findUnique({ where: { id: channelId } });
    if (!channel) notFound();

    return (
        <div className="space-y-4">
            {/* Mobile Header */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/channel/${channelId}/pos/refill`}
                    className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-base font-bold text-slate-900">ขอสินค้าเพิ่ม</h1>
                    <p className="text-xs text-slate-400">{channel.name}</p>
                </div>
            </div>

            <NewRefillClient
                channels={[{ id: channel.id, name: channel.name, code: channel.code }]}
                preselectedChannelId={channelId}
                hideChannelSelect
                redirectTo={`/channel/${channelId}/pos/refill`}
                backHref={`/channel/${channelId}/pos/refill`}
            />
        </div>
    );
}
