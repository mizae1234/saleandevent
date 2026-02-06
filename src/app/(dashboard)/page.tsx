export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-slate-500">ภาพรวมระบบบริหารจัดการ Saran Jeans</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder Cards */}
        {[
          { title: "Active Events", value: "3", color: "bg-blue-500" },
          { title: "PC On Duty", value: "12", color: "bg-green-500" },
          { title: "Pending Request", value: "5", color: "bg-orange-500" },
          { title: "Today Sales", value: "฿ 45,200", color: "bg-indigo-500" },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">{item.title}</h3>
            <div className={`mt-2 text-2xl font-bold`}>{item.value}</div>
            <div className={`mt-2 h-1 w-full rounded-full ${item.color} opacity-20`}>
              <div className={`h-1 rounded-full ${item.color}`} style={{ width: '70%' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
        <p className="mt-4 text-center text-sm text-slate-500 py-10">
          No recent activity.
        </p>
      </div>
    </div>
  );
}
