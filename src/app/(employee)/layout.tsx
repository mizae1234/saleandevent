import { BottomNav } from "@/components/layout/BottomNav";
import { EmployeeHeader } from "@/components/layout/EmployeeHeader";

export default function EmployeeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-dvh bg-slate-50 flex flex-col overflow-hidden">
            <EmployeeHeader />
            <main className="flex-1 pb-24 flex flex-col overflow-y-auto min-h-0">
                <div className="max-w-lg lg:max-w-7xl mx-auto px-4 py-6 w-full">
                    {children}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
