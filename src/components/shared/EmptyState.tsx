import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import type { ReactNode, ElementType } from "react";

interface EmptyStateProps {
    /** Lucide icon component */
    icon?: ElementType;
    /** Main message */
    message: string;
    /** Optional description below the message */
    description?: string;
    /** Optional action button */
    action?: ReactNode;
    /** Extra className for the container */
    className?: string;
}

export function EmptyState({
    icon: Icon = Package,
    message,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
            <div className="rounded-full bg-slate-100 p-4 mb-4">
                <Icon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">{message}</h3>
            {description && (
                <p className="mt-1 text-xs text-slate-400 max-w-xs">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
