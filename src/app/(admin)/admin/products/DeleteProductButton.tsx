"use client";

import { deleteProduct } from "@/actions/product-actions";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function DeleteProductButton({ barcode, name }: { barcode: string; name: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!confirm(`ต้องการลบสินค้า "${name}" หรือไม่?`)) return;
        startTransition(async () => {
            await deleteProduct(barcode);
            window.location.reload();
        });
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
        >
            <Trash2 className="h-3.5 w-3.5" />
        </button>
    );
}
