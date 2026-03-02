import { DashboardClient } from "./DashboardClient";

export const metadata = {
  title: "Dashboard — Saran Jeans",
};

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <DashboardClient />
    </div>
  );
}
