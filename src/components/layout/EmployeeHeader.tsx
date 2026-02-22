import { getSession } from "@/lib/auth";
import { LogOutButton } from "./LogOutButton";

export async function EmployeeHeader() {
    const session = await getSession();

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm">
                        <span className="text-white text-sm font-bold">
                            {session?.name?.charAt(0) || 'U'}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">{session?.name || 'พนักงาน'}</p>
                        <p className="text-xs text-slate-400">{session?.role || ''}</p>
                    </div>
                </div>
                <LogOutButton />
            </div>
        </header>
    );
}
