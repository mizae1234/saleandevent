"use client";

import { logoutAction } from "@/actions/auth-actions";
import { LogOut } from "lucide-react";

export function LogOutButton() {
    return (
        <form action={logoutAction}>
            <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">ออก</span>
            </button>
        </form>
    );
}
