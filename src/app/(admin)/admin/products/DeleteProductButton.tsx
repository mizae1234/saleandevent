"use client";

import { toggleProductStatus } from "@/actions/product-actions";
import { useTransition, useState } from "react";
import { cn } from "@/lib/utils";

export function DeleteProductButton({ barcode, name, status }: { barcode: string; name: string; status: string }) {
    const [isPending, startTransition] = useTransition();
    const [optimisticStatus, setOptimisticStatus] = useState(status);
    const isActive = optimisticStatus === 'active';

    const handleToggle = () => {
        const newStatus = isActive ? 'inactive' : 'active';
        setOptimisticStatus(newStatus);
        
        startTransition(async () => {
            // We pass the true remote status so the toggle flips it based on server logic
            const result = await toggleProductStatus(barcode, status);
            // If the action errors, we revert the optimistic update by resetting to remote status
            if (result?.error) {
                setOptimisticStatus(status);
            }
        });
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isActive}
            disabled={isPending}
            onClick={handleToggle}
            title={isActive ? `ระงับสินค้า "${name}"` : `เปิดใช้งานสินค้า "${name}"`}
            className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                isActive ? "bg-teal-500" : "bg-slate-300"
            )}
        >
            <span
                className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm",
                    isActive ? "translate-x-[18px]" : "translate-x-0.5"
                )}
            />
        </button>
    );
}
