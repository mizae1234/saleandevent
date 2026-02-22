"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ShoppingCart, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [showChannelPrompt, setShowChannelPrompt] = useState(false);

    // Extract channel ID from current URL (e.g., /channel/abc-123/pos/sell → abc-123)
    const channelMatch = pathname.match(/^\/channel\/([^/]+)/);
    const currentChannelId = channelMatch ? channelMatch[1] : null;

    const NAV_ITEMS = [
        { href: "/workspace", icon: Home, label: "หน้าหลัก" },
        {
            href: currentChannelId ? `/channel/${currentChannelId}/pos/sell` : "#",
            icon: ShoppingCart,
            label: "POS",
            matchPrefix: "/pos",
            requiresChannel: true,
        },
        {
            href: currentChannelId ? `/channel/${currentChannelId}/payroll` : "#",
            icon: Wallet,
            label: "ค่าแรง/เงินเดือน",
            matchPrefix: "/payroll",
            requiresChannel: true,
        },
        { href: "/workspace/profile", icon: User, label: "โปรไฟล์" },
    ];

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.matchPrefix) {
            return pathname.includes(item.matchPrefix);
        }
        return pathname === item.href;
    };

    const handlePOSClick = (e: React.MouseEvent, item: typeof NAV_ITEMS[0]) => {
        if (item.requiresChannel && !currentChannelId) {
            e.preventDefault();
            setShowChannelPrompt(true);
            // Auto-dismiss after 3 seconds
            setTimeout(() => setShowChannelPrompt(false), 3000);
        }
    };

    return (
        <>
            {/* Channel selection prompt overlay */}
            {showChannelPrompt && (
                <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="h-5 w-5 text-teal-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">เลือกสาขาก่อน</p>
                            <p className="text-xs text-slate-400">กรุณาเลือก Event หรือสาขาจากหน้าหลักก่อน</p>
                        </div>
                        <button
                            onClick={() => {
                                setShowChannelPrompt(false);
                                router.push('/workspace');
                            }}
                            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors flex-shrink-0"
                        >
                            เลือก
                        </button>
                    </div>
                </div>
            )}

            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] safe-area-bottom">
                <div className="flex items-center justify-around px-2 py-1">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                onClick={(e) => handlePOSClick(e, item)}
                                className={cn(
                                    "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[64px]",
                                    active
                                        ? "text-teal-600"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-colors",
                                    active && "bg-teal-50"
                                )}>
                                    <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium whitespace-nowrap",
                                    active && "font-semibold"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
