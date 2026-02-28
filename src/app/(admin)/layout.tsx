import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { getSession } from "@/lib/auth";
import { Providers } from "./Providers";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    const allowedMenus = session?.allowedMenus || [];
    const userName = session?.name || "User";
    const userRole = session?.role || "";

    return (
        <Providers>
            <div className="flex h-screen bg-slate-50">
                <MobileNav allowedMenus={allowedMenus} userName={userName} userRole={userRole} />
                <Sidebar allowedMenus={allowedMenus} userName={userName} userRole={userRole} />
                <main className="flex-1 overflow-y-auto">
                    <div className="container mx-auto p-4 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </Providers>
    );
}
