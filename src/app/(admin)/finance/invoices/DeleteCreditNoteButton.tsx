"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteCreditNote } from "@/actions/credit-note-actions";
import { Spinner } from "@/components/shared";

interface Props {
    cnId: string;
}

export function DeleteCreditNoteButton({ cnId }: Props) {
    const [isPending, startTransition] = useTransition();
    const { toastSuccess, toastError } = useToast();

    const handleDelete = () => {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบใบลดหนี้นี้? (ข้อมูลจะถูกลบทิ้งอย่างถาวร)")) {
            return;
        }

        startTransition(async () => {
            const res = await deleteCreditNote(cnId);
            if (res.success) {
                toastSuccess("ลบใบลดหนี้เรียบร้อยแล้ว");
                // The revalidation will refresh the parent list automatically if we called revalidatePath inside the action
                // Wait, deleteCreditNote doesn't have revalidatePath yet, so let's just reload 
                window.location.reload(); 
            } else {
                toastError(res.error || "เกิดข้อผิดพลาดในการลบใบลดหนี้");
            }
        });
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            title="ลบใบลดหนี้"
        >
            {isPending ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
        </button>
    );
}
