"use client";

import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/actions/customer-actions";
import { useTransition } from "react";
import { ConfirmDialog } from "@/components/shared";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            await deleteCustomer(id);
        });
    };

    return (
        <ConfirmDialog
            trigger={
                <button
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="ลบ"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            }
            title={`ลบลูกค้า "${name}"`}
            message="เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
            confirmText="ลบ"
            variant="danger"
            onConfirm={handleDelete}
            disabled={isPending}
        />
    );
}
