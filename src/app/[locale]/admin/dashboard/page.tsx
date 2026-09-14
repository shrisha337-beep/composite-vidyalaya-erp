import { prisma } from "@/lib/prisma";
import { Users, UserCheck, CalendarCheck, FileText, Bell, PlusCircle, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

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
    pendingLeaves,
    recentNotices,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: today, lt: tomorrow } },
      _count: { status: true },
    }),
    prisma.leaveRequest.count({
      where: { status: "PENDING" },
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
  const totalMarked = attendanceToday.reduce((s, r) => s + r._count.status, 0);

  return {
    totalStudents,
    totalTeachers,
    presentCount,
    totalMarked,
    pendingLeaves,
    recentNotices,
  };
}

// ─── Stat card component matching mockup ──────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  badgeBg,
  badgeColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  badgeBg: string;
  badgeColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4 transition-all duration-150 hover:shadow-sm">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: badgeBg }}
      >
        <Icon className="h-6 w-6" style={{ color: badgeColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl lg:text-3xl font-bold text-[#2D2A26] leading-none mb-1">
          {value}
        </p>
        <p className="text-xs lg:text-sm font-medium text-[#7A7267] truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  const stats = await getDashboardStats();

  const attendancePct =
    stats.totalMarked > 0
      ? `${Math.round((stats.presentCount / stats.totalMarked) * 100)}%`
      : "—";

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
      {/* Page header with maroon accent underline */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#2D2A26] tracking-tight">
          Dashboard
        </h1>
        <div className="w-12 h-1 bg-[#6B1D30] rounded-full mt-2 mb-2" />
        <p className="text-sm font-medium text-[#7A7267]">{todayStr}</p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon={Users}
          badgeBg="#E8EDF2"
          badgeColor="#3D5A80"
        />
        <StatCard
          label="Teachers"
          value={stats.totalTeachers}
          icon={UserCheck}
          badgeBg="#E6F4F1"
          badgeColor="#2A9D8F"
        />
        <StatCard
          label="Attendance Today"
          value={attendancePct}
          icon={CalendarCheck}
          badgeBg="#FBF5E5"
          badgeColor="#B8860B"
        />
        <StatCard
          label="Pending Leaves"
          value={stats.pendingLeaves}
          icon={FileText}
          badgeBg="#FBECE9"
          badgeColor="#E76F51"
        />
      </div>

      {/* Main Grid: Notices (Left) + Quick Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E0D4] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E0D4] mb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#6B1D30]" />
                <h2 className="text-base font-bold text-[#2D2A26]">
                  Recent Notices / हाल की सूचनाएं
                </h2>
              </div>
              <Link
                href={`/${locale}/admin/notifications`}
                className="text-xs font-semibold text-[#6B1D30] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {stats.recentNotices.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-[#7A7267]">No notices posted yet.</p>
                <Link
                  href={`/${locale}/admin/notifications`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B1D30] hover:underline mt-2"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Post first notice
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#E8E0D4]/60">
                {stats.recentNotices.map((n) => (
                  <li key={n.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {n.isEmergency && (
                        <span className="shrink-0 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Urgent
                        </span>
                      )}
                      <span className="text-sm font-medium text-[#2D2A26] truncate">
                        {n.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-medium text-[#7A7267] capitalize">
                        {n.audience.toLowerCase().replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#7A7267]">
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
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-[#E8E0D4] p-6 shadow-xs">
          <h2 className="text-base font-bold text-[#2D2A26] mb-4 pb-3 border-b border-[#E8E0D4]">
            Quick Actions / त्वरित कार्रवाई
          </h2>
          <div className="space-y-3">
            <Link
              href={`/${locale}/admin/students/new`}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D2A26]/20 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-[#2D2A26] font-medium text-sm transition-all duration-150 flex items-center justify-center text-center shadow-2xs"
            >
              Admit Student / नया छात्र प्रवेश
            </Link>
            <Link
              href={`/${locale}/admin/teachers/new`}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D2A26]/20 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-[#2D2A26] font-medium text-sm transition-all duration-150 flex items-center justify-center text-center shadow-2xs"
            >
              Add Teacher / नया शिक्षक जोड़ें
            </Link>
            <Link
              href={`/${locale}/admin/leave-requests`}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D2A26]/20 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-[#2D2A26] font-medium text-sm transition-all duration-150 flex items-center justify-center text-center shadow-2xs"
            >
              Pending Leaves / अवकाश समीक्षा
            </Link>
            <Link
              href={`/${locale}/admin/attendance`}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D2A26]/20 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-[#2D2A26] font-medium text-sm transition-all duration-150 flex items-center justify-center text-center shadow-2xs"
            >
              School Attendance / दैनिक उपस्थिति
            </Link>
            <Link
              href={`/${locale}/admin/reports`}
              className="w-full py-2.5 px-4 rounded-xl border border-[#2D2A26]/20 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-[#2D2A26] font-medium text-sm transition-all duration-150 flex items-center justify-center text-center shadow-2xs"
            >
              Reports Hub / रिपोर्ट पोर्टल
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
