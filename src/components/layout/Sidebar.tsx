"use client";

import { MENU_SECTIONS } from "@/config/menu";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({ className, onNavigated }: { className?: string, onNavigated?: () => void }) {
    const pathname = usePathname();

    // Check if menu item is active - exact match only
    const isMenuActive = (href: string) => {
        if (pathname === href) return true;
        return false;
    };

    return (
        <aside className={cn(
            "w-64 h-screen hidden md:flex flex-col",
            "bg-gradient-to-b from-slate-50 to-white",
            "shadow-[4px_0_24px_-12px_rgba(0,0,0,0.15)]",
            className
        )}>
            {/* Logo Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-sm">SJ</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-800">Saran Jeans</h1>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-3">
                <nav className="space-y-6">
                    {MENU_SECTIONS.map((section, index) => (
                        <div key={section.title}>
                            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = isMenuActive(item.href);
                                    const Icon = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onNavigated}
                                            className={cn(
                                                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                            <Icon className={cn(
                                                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                                isActive
                                                    ? "text-indigo-600"
                                                    : "text-slate-400 group-hover:text-slate-600"
                                            )} />
                                            {item.title}
                                        </Link>
                                    );
                                })}
                            </div>
                            {/* Divider between sections */}
                            {index < MENU_SECTIONS.length - 1 && (
                                <div className="mt-6 mx-3 border-t border-slate-100" />
                            )}
                        </div>
                    ))}
                </nav>
            </div>

            {/* User Profile Footer */}
            <div className="p-4 mx-3 mb-3 rounded-xl bg-slate-100/50">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-medium">A</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-700 truncate">Admin User</p>
                        <p className="text-xs text-slate-500">Super Admin</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
