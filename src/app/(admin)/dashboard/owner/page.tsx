import { DashboardClient } from "./DashboardClient";

export const metadata = {
    title: "Owner Dashboard — Executive View",
};

export default function OwnerDashboardPage() {
    return (
        <div className="max-w-7xl mx-auto">
            <DashboardClient />
        </div>
    );
}
