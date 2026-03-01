import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode, ElementType } from "react";

interface PageHeaderProps {
    /** Page title */
    title: string;
    /** Optional subtitle / description */
    subtitle?: string;
    /** Back link URL — shows ArrowLeft icon */
    back?: string;
    /** Optional icon before title */
    icon?: ElementType;
    /** Action buttons on the right */
    actions?: ReactNode;
    /** Extra className */
    className?: string;
}

export function PageHeader({
    title,
    subtitle,
    back,
    icon: Icon,
    actions,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between gap-4 mb-6", className)}>
            <div className="flex items-center gap-3 min-w-0">
                {back && (
                    <Link
                        href={back}
                        className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                )}
                {Icon && (
                    <div className="p-2 bg-teal-50 rounded-lg shrink-0">
                        <Icon className="h-5 w-5 text-teal-600" />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-slate-900 truncate">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-slate-500 truncate">{subtitle}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}
