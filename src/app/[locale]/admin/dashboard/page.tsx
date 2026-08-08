import { prisma } from "@/lib/prisma";
import { Users, UserCheck, UtensilsCrossed, Bell } from "lucide-react";
import { requireRole } from "@/lib/rbac";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalStudents,
    totalTeachers,
    attendanceToday,
    mdmToday,
    recentNotices,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    // Group by status to get present/absent counts
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: today, lt: tomorrow } },
      _count: { status: true },
    }),
    // Today's MDM — sum mealsServed across all meal types
    prisma.mDMDailyLog.aggregate({
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { mealsServed: true },
    }),
    prisma.notice.findMany({
      orderBy: { postedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        postedAt: true,
        audience: true,
        isEmergency: true,
      },
    }),
  ]);

  const presentCount =
    attendanceToday.find((r) => r.status === "PRESENT")?._count.status ?? 0;
  const absentCount =
    attendanceToday.find((r) => r.status === "ABSENT")?._count.status ?? 0;
  const totalMarked = attendanceToday.reduce((s, r) => s + r._count.status, 0);

  return {
    totalStudents,
    totalTeachers,
    presentCount,
    absentCount,
    totalMarked,
    mdmServed: mdmToday._sum.mealsServed ?? null,
    recentNotices,
  };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}15` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);

  const stats = await getDashboardStats();

  const attendancePct =
    stats.totalMarked > 0
      ? Math.round((stats.presentCount / stats.totalMarked) * 100)
      : null;

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{todayStr}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          sub="Currently enrolled"
          icon={Users}
          color="#7c2d12"
        />
        <StatCard
          label="Teachers"
          value={stats.totalTeachers}
          sub="Active staff"
          icon={UserCheck}
          color="#1d4ed8"
        />
        <StatCard
          label="Attendance Today"
          value={attendancePct !== null ? `${attendancePct}%` : "—"}
          sub={
            stats.totalMarked > 0
              ? `${stats.presentCount} present · ${stats.absentCount} absent`
              : "Not marked yet"
          }
          icon={UserCheck}
          color="#15803d"
        />
        <StatCard
          label="Meals Served Today"
          value={stats.mdmServed !== null ? stats.mdmServed : "—"}
          sub={stats.mdmServed !== null ? "MDM count recorded" : "Not recorded yet"}
          icon={UtensilsCrossed}
          color="#b45309"
        />
      </div>

      {/* Recent notices */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Recent Notices</h2>
        </div>

        {stats.recentNotices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No notices posted yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {stats.recentNotices.map((n) => (
              <li key={n.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  {n.isEmergency && (
                    <span className="shrink-0 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                      Urgent
                    </span>
                  )}
                  <span className="text-sm text-gray-700 truncate">{n.title}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 capitalize">
                    {n.audience.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.postedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
