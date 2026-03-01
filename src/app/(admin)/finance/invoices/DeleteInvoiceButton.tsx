"use client";

import { deleteInvoice } from "@/actions/invoice-actions";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared";

export function DeleteInvoiceButton({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { toastError } = useToast();

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteInvoice(id);
            router.refresh();
        } catch (e: any) {
            toastError(e.message || "เกิดข้อผิดพลาด");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ConfirmDialog
            trigger={
                <button
                    disabled={loading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="ลบ"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            }
            title="ลบ Invoice ฉบับร่าง"
            message="ต้องการลบ Invoice ฉบับร่างนี้หรือไม่?"
            confirmText="ลบ"
            variant="danger"
            onConfirm={handleDelete}
            disabled={loading}
        />
    );
}
