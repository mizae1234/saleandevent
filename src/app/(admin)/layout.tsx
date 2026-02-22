import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-slate-50">
            <MobileNav />
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
