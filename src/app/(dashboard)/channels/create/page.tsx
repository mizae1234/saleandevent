import { db } from "@/lib/db";
import CreateChannelForm from "./CreateChannelForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function CreateChannelPage() {
    const staffList = await db.staff.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="p-6">
            <div className="mb-6">
                <Link href="/channels" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
                    <ArrowLeft className="h-4 w-4" /> กลับหน้ารายการ
                </Link>
            </div>

            <CreateChannelForm staffList={staffList.map(s => ({
                id: s.id,
                name: s.name,
                role: s.role,
                phone: s.phone,
            }))} />
        </div>
    );
}
