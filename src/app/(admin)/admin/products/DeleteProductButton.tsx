"use client";

import { toggleProductStatus } from "@/actions/product-actions";
import { Ban, CheckCircle } from "lucide-react";
import { useTransition } from "react";
import { ConfirmDialog } from "@/components/shared";

export function DeleteProductButton({ barcode, name, status }: { barcode: string; name: string; status: string }) {
    const [isPending, startTransition] = useTransition();
    const isActive = status === 'active';

    const handleToggle = () => {
        startTransition(async () => {
            await toggleProductStatus(barcode, status);
        });
    };

    return (
        <ConfirmDialog
            trigger={
                <button
                    type="button"
                    disabled={isPending}
                    className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                        isActive ? 'text-rose-500 hover:text-rose-700' : 'text-emerald-500 hover:text-emerald-700'
                    }`}
                >
                    {isActive ? (
                        <>
                            <Ban className="h-3.5 w-3.5" />
                            Inactive
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                        </>
                    )}
                </button>
            }
            title={isActive ? `เปลี่ยนสถานะเป็น Inactive "${name}"` : `เปลี่ยนสถานะเป็น Active "${name}"`}
            message={isActive ? "สินค้านี้จะไม่สามารถใช้ออกบิลได้ชั่วคราว" : "สินค้าจะกลับมาแสดงให้เลือกในระบบอีกครั้ง"}
            confirmText="ยืนยัน"
            variant={isActive ? "danger" : "default"}
            onConfirm={handleToggle}
            disabled={isPending}
        />
    );
}
