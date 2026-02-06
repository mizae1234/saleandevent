"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

export function MobileNav() {
    const [open, setOpen] = useState(false);

    // Prevent scrolling when menu is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [open]);

    return (
        <>
            {/* Hamburger Button - Only visible on mobile */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="md:hidden fixed top-4 right-4 z-[60] bg-white p-2 rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                aria-label="Open menu"
            >
                <Menu className="h-6 w-6" />
            </button>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-[70] backdrop-blur-[2px] transition-opacity md:hidden"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Drawer */}
            <div className={`fixed inset-y-0 left-0 z-[80] w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${open ? "translate-x-0" : "-translate-x-full"
                }`}>
                <Sidebar
                    className="h-full w-full flex border-r-0 shadow-none"
                    onNavigated={() => setOpen(false)}
                />
            </div>
        </>
    );
}
