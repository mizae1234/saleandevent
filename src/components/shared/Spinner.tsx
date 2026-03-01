import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<SpinnerSize, string> = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
};

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
    /** Show text next to spinner */
    label?: string;
}

export function Spinner({ size = "sm", className, label }: SpinnerProps) {
    const icon = (
        <Loader2
            className={cn("animate-spin text-slate-400", sizeMap[size], className)}
        />
    );

    if (label) {
        return (
            <span className="inline-flex items-center gap-2">
                {icon}
                <span className="text-sm text-slate-500">{label}</span>
            </span>
        );
    }

    return icon;
}

/** Full-page centered spinner */
export function SpinnerFullPage({ label }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-teal-600" />
            {label && <p className="mt-3 text-sm text-slate-500">{label}</p>}
        </div>
    );
}
