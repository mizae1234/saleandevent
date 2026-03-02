import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
    return (
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                    <Construction className="h-10 w-10 text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">กำลังพัฒนา</h1>
                <p className="text-slate-500 mb-6">หน้ารายงานสรุปกำลังอยู่ระหว่างพัฒนา<br />จะเปิดให้ใช้งานเร็ว ๆ นี้</p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    กลับหน้าหลัก
                </Link>
            </div>
        </div>
    );
}
