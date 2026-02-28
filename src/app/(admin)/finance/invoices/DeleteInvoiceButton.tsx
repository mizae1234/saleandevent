"use client";

import { deleteInvoice } from "@/actions/invoice-actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteInvoiceButton({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm("ต้องการลบ Invoice ฉบับร่างนี้หรือไม่?")) return;
        setLoading(true);
        try {
            await deleteInvoice(id);
            router.refresh();
        } catch (e: any) {
            alert(e.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="ลบ"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );
}
