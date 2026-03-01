import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ElementType } from "react";

// ─── Shared base style ─────────────────────────────
const baseInputClass =
    "w-full px-4 py-2.5 rounded-lg border-0 border-b-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none transition-colors";

const disabledClass = "bg-slate-100 text-slate-500 cursor-not-allowed";

// ─── FormInput ──────────────────────────────────────
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: ElementType;
    error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
    ({ label, icon: Icon, error, className, disabled, ...props }, ref) => (
        <div>
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
            )}
            <div className="relative">
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
                <input
                    ref={ref}
                    className={cn(
                        baseInputClass,
                        Icon && "pl-10",
                        disabled && disabledClass,
                        error && "border-red-400 focus:border-red-500",
                        className
                    )}
                    disabled={disabled}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
);
FormInput.displayName = "FormInput";

// ─── FormTextarea ───────────────────────────────────
interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    ({ label, error, className, disabled, ...props }, ref) => (
        <div>
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
            )}
            <textarea
                ref={ref}
                className={cn(
                    baseInputClass,
                    "resize-none",
                    disabled && disabledClass,
                    error && "border-red-400 focus:border-red-500",
                    className
                )}
                disabled={disabled}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
);
FormTextarea.displayName = "FormTextarea";

// ─── FormSelect ─────────────────────────────────────
interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ label, error, className, disabled, children, ...props }, ref) => (
        <div>
            {label && (
                <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
            )}
            <select
                ref={ref}
                className={cn(
                    baseInputClass,
                    "cursor-pointer text-slate-600",
                    disabled && disabledClass,
                    error && "border-red-400 focus:border-red-500",
                    className
                )}
                disabled={disabled}
                {...props}
            >
                {children}
            </select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
);
FormSelect.displayName = "FormSelect";
