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
          { title: "Active Events", value: "3", color: "bg-teal-500" },
          { title: "PC On Duty", value: "12", color: "bg-emerald-500" },
          { title: "Pending Request", value: "5", color: "bg-amber-500" },
          { title: "Today Sales", value: "฿ 45,200", color: "bg-teal-600" },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
            <h3 className="text-sm font-medium text-slate-500">{item.title}</h3>
            <div className={`mt-2 text-2xl font-bold`}>{item.value}</div>
            <div className={`mt-2 h-1 w-full rounded-full ${item.color} opacity-20`}>
              <div className={`h-1 rounded-full ${item.color}`} style={{ width: '70%' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-100">
        <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
        <p className="mt-4 text-center text-sm text-slate-500 py-10">
          No recent activity.
        </p>
      </div>
    </div>
  );
}
