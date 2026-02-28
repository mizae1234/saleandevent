"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

// ─── Types ───
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
    toastSuccess: (message: string) => void;
    toastError: (message: string) => void;
    toastWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

// ─── Provider ───
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    const value: ToastContextValue = {
        toast: addToast,
        toastSuccess: (msg) => addToast(msg, "success"),
        toastError: (msg) => addToast(msg, "error"),
        toastWarning: (msg) => addToast(msg, "warning"),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ─── Toast Item ───
const iconMap = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
};

const bgMap = {
    success: "bg-emerald-50 border-emerald-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info: "bg-blue-50 border-blue-200",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 ${bgMap[toast.type]}`}
        >
            {iconMap[toast.type]}
            <p className="text-sm text-slate-800 flex-1 pt-0.5">{toast.message}</p>
            <button
                onClick={onClose}
                className="p-0.5 rounded-md hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
