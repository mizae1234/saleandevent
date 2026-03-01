"use client";

import { useState, useCallback, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    /** Trigger element — receives onClick to open dialog */
    trigger: ReactNode;
    /** Dialog title */
    title: string;
    /** Dialog description/message */
    message?: string;
    /** Confirm button text (default: "ยืนยัน") */
    confirmText?: string;
    /** Cancel button text (default: "ยกเลิก") */
    cancelText?: string;
    /** Callback when user confirms */
    onConfirm: () => void | Promise<void>;
    /** Variant changes button color */
    variant?: "danger" | "warning" | "default";
    /** Disable the confirm button */
    disabled?: boolean;
}

const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    default: "bg-teal-600 hover:bg-teal-700 text-white",
};

export function ConfirmDialog({
    trigger,
    title,
    message,
    confirmText = "ยืนยัน",
    cancelText = "ยกเลิก",
    onConfirm,
    variant = "default",
    disabled = false,
}: ConfirmDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = useCallback(async () => {
        try {
            setLoading(true);
            await onConfirm();
            setOpen(false);
        } catch {
            // Let caller handle errors
        } finally {
            setLoading(false);
        }
    }, [onConfirm]);

    return (
        <>
            <span onClick={() => !disabled && setOpen(true)}>{trigger}</span>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !loading && setOpen(false)}
                    />
                    {/* Dialog */}
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "rounded-full p-2 shrink-0",
                                variant === "danger" ? "bg-red-100" : variant === "warning" ? "bg-amber-100" : "bg-teal-100"
                            )}>
                                <AlertTriangle className={cn(
                                    "h-5 w-5",
                                    variant === "danger" ? "text-red-600" : variant === "warning" ? "text-amber-600" : "text-teal-600"
                                )} />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                                {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                type="button"
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50",
                                    variantStyles[variant]
                                )}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? "กำลังดำเนินการ..." : confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
