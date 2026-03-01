"use client";

import { deleteProduct } from "@/actions/product-actions";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { ConfirmDialog } from "@/components/shared";

export function DeleteProductButton({ barcode, name }: { barcode: string; name: string }) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        startTransition(async () => {
            await deleteProduct(barcode);
            window.location.reload();
        });
    };

    return (
        <ConfirmDialog
            trigger={
                <button
                    type="button"
                    disabled={isPending}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            }
            title={`ลบสินค้า "${name}"`}
            message="เมื่อลบแล้วจะไม่สามารถกู้คืนได้"
            confirmText="ลบ"
            variant="danger"
            onConfirm={handleDelete}
            disabled={isPending}
        />
    );
}
