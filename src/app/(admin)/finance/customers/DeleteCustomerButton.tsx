"use client";

import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/actions/customer-actions";
import { useTransition } from "react";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm(`ยืนยันลบลูกค้า "${name}"?`)) return;
        startTransition(async () => {
            await deleteCustomer(id);
        });
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="ลบ"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );
}
