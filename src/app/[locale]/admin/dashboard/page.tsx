import { prisma } from "@/lib/prisma";
import {
  Users,
  UserCheck,
  CalendarCheck,
  FileText,
  Bell,
  PlusCircle,
  ArrowRight,
  UtensilsCrossed,
  Clock,
  BarChart3,
  UserPlus,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { getSchoolSettings } from "@/lib/data/school-settings";
import { getSchoolBranding } from "@/lib/branding";

// --- Data fetching ---

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
    activeSession,
    schoolSettings,
    totalClasses,
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
    prisma.academicSession.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    }),
    getSchoolSettings(),
    prisma.class.count(),
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
    activeSession,
    schoolSettings,
    totalClasses,
  };
}

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
      ? Math.round((stats.presentCount / stats.totalMarked) * 100)
      : null;

  const todayEnglish = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const branding = getSchoolBranding();

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E8E0D4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6B1D30] bg-[#6B1D30]/10 px-2 py-0.5 rounded-sm">
              {branding.systemTag}
            </span>
            <span className="text-xs text-[#7A7267]">{branding.isDemo ? "Demo School Portal" : "Official ERP Portal"}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D2A26] tracking-tight mt-1">
            Admin Overview / प्रशासनिक डैशबोर्ड
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold text-[#2D2A26]">{todayEnglish}</p>
          <p className="text-xs text-[#7A7267]">
            Session: {stats.activeSession?.label || "2026-2027"}
          </p>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bento 1: Institutional Identity & Session (2 cols on desktop) */}
        <div className="md:col-span-2 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-gradient-to-b from-[#6B1D30] to-[#541624] text-white flex items-center justify-center font-serif font-bold text-base border border-[#541624] shadow-xs shrink-0">
                  CV
                </div>
                <div>
                  <h2 className="font-school-header text-lg font-semibold text-[#2D2A26] leading-tight">
                    {branding.isDemo
                      ? branding.schoolNameEnglish
                      : stats.schoolSettings.schoolName || branding.schoolNameEnglish}
                  </h2>
                  <p className="text-xs text-[#7A7267] font-medium mt-0.5">
                    {branding.schoolNameHindi}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Active Session
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#E8E0D4]">
              <div className="p-2 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">UDISE Code</p>
                <p className="text-xs font-bold text-[#2D2A26] mt-0.5 font-mono">
                  {branding.isDemo
                    ? branding.udiseCode
                    : stats.schoolSettings.udiseCode || branding.udiseCode}
                </p>
              </div>
              <div className="p-2 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Block / ब्लॉक</p>
                <p className="text-xs font-bold text-[#2D2A26] mt-0.5">
                  {branding.isDemo
                    ? branding.schoolBlock
                    : stats.schoolSettings.schoolBlock || branding.schoolBlock}
                </p>
              </div>
              <div className="p-2 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">District / जनपद</p>
                <p className="text-xs font-bold text-[#2D2A26] mt-0.5">
                  {branding.isDemo
                    ? branding.schoolDistrict
                    : stats.schoolSettings.schoolDistrict || branding.schoolDistrict}
                </p>
              </div>
              <div className="p-2 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Classes / कक्षाएं</p>
                <p className="text-xs font-bold text-[#2D2A26] mt-0.5">1 to 8 (Composite)</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4] flex items-center justify-between text-xs text-[#7A7267]">
            <span>{branding.governanceShort}</span>
            <Link
              href={`/${locale}/admin/settings`}
              className="text-[#6B1D30] font-semibold hover:underline flex items-center gap-1"
            >
              School Settings <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 2: Attendance Pulse (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#3D5A80]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Today Attendance
                </h3>
              </div>
              <span className="text-[10px] text-[#7A7267] font-medium">Daily</span>
            </div>

            <div className="my-2">
              <div className="text-3xl font-bold text-[#2D2A26] tracking-tight">
                {attendancePct !== null ? `${attendancePct}%` : "Not Marked"}
              </div>
              <p className="text-xs text-[#7A7267] mt-1 font-medium">
                {stats.totalMarked > 0
                  ? `${stats.presentCount} of ${stats.totalMarked} students present`
                  : "Daily register pending"}
              </p>
            </div>

            {attendancePct !== null && (
              <div className="w-full bg-[#E8E0D4] h-2 rounded-xs overflow-hidden mt-3">
                <div
                  className="bg-[#2A9D8F] h-full"
                  style={{ width: `${attendancePct}%` }}
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            <Link
              href={`/${locale}/admin/attendance`}
              className="w-full py-2 px-3 rounded-sm bg-[#F3EDE4] hover:bg-[#E8E0D4] text-[#2D2A26] text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-[#E8E0D4]"
            >
              Open Daily Register <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 3: Staff & Faculty Overview (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#B8860B]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Staff & Leaves
                </h3>
              </div>
              {stats.pendingLeaves > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> {stats.pendingLeaves} Review
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-700">Clear</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="p-2.5 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Total Teachers</p>
                <p className="text-2xl font-bold text-[#2D2A26] mt-0.5">
                  {stats.totalTeachers}
                </p>
              </div>
              <div className="p-2.5 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Total Enrolled</p>
                <p className="text-2xl font-bold text-[#2D2A26] mt-0.5">
                  {stats.totalStudents}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            <Link
              href={`/${locale}/admin/leave-requests`}
              className="w-full py-2 px-3 rounded-sm bg-[#F3EDE4] hover:bg-[#E8E0D4] text-[#2D2A26] text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-[#E8E0D4]"
            >
              {stats.pendingLeaves > 0
                ? `Review ${stats.pendingLeaves} Pending Leaves`
                : "Staff Leave Ledger"}{" "}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 4: Mid-Day Meal (PM-POSHAN) Daily Tracker (2 cols) */}
        <div className="md:col-span-2 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D4] mb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-[#6B1D30]" />
                <h3 className="text-sm font-bold text-[#2D2A26]">
                  Mid-Day Meal (PM-POSHAN) / मध्याह्न भोजन योजना
                </h3>
              </div>
              <Link
                href={`/${locale}/admin/mdm`}
                className="text-xs font-semibold text-[#6B1D30] hover:underline flex items-center gap-1"
              >
                MDM Console <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
              <div className="p-3 bg-[#F3EDE4]/40 rounded-sm border border-[#E8E0D4]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#2D2A26]">Primary (Classes 1 to 5)</span>
                  <span className="text-xs font-semibold text-[#6B1D30]">
                    ₹{stats.schoolSettings.conversionCostPrimary.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-[#7A7267]">
                  Conversion cost per meal: Food grains 100g (Wheat/Rice)
                </p>
              </div>

              <div className="p-3 bg-[#F3EDE4]/40 rounded-sm border border-[#E8E0D4]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#2D2A26]">Upper Primary (Classes 6 to 8)</span>
                  <span className="text-xs font-semibold text-[#6B1D30]">
                    ₹{stats.schoolSettings.conversionCostJunior.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-[#7A7267]">
                  Conversion cost per meal: Food grains 150g (Wheat/Rice)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#E8E0D4] flex items-center justify-between text-xs">
            <span className="text-[#7A7267]">
              Track daily consumption, monthly grain balance, and cost registers.
            </span>
            <Link
              href={`/${locale}/admin/mdm`}
              className="py-1.5 px-3 rounded-sm bg-[#6B1D30] text-white font-medium hover:bg-[#581726] transition-colors shrink-0"
            >
              Update Today Meal Entry
            </Link>
          </div>
        </div>

        {/* Bento 5: Administrative Action Hub (2 cols) */}
        <div className="md:col-span-2 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D4] mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#3D5A80]" />
              <h3 className="text-sm font-bold text-[#2D2A26]">
                Quick Operations / त्वरित कार्रवाई
              </h3>
            </div>
            <span className="text-xs text-[#7A7267]">Direct Portal Actions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Link
              href={`/${locale}/admin/students/new`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <UserPlus className="h-4 w-4 text-[#6B1D30] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  New Admission
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">नया छात्र प्रवेश</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/admin/teachers/new`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <UserCheck className="h-4 w-4 text-[#3D5A80] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  Add Teacher
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">शिक्षक पंजीकरण</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/admin/reports/tc`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <FileText className="h-4 w-4 text-[#2A9D8F] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  Issue TC
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">स्थानांतरण प्रमाण पत्र</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/admin/attendance`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <CalendarCheck className="h-4 w-4 text-[#B8860B] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  Attendance
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">दैनिक उपस्थिति</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/admin/timetable`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <Clock className="h-4 w-4 text-[#7A7267] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  Timetable
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">समय सारणी</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/admin/reports`}
              className="p-3 rounded-sm border border-[#E8E0D4] hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 text-left transition-all group flex flex-col justify-between"
            >
              <BarChart3 className="h-4 w-4 text-[#E76F51] mb-2" />
              <div>
                <p className="text-xs font-bold text-[#2D2A26] leading-tight group-hover:text-[#6B1D30]">
                  Reports Hub
                </p>
                <p className="text-[10px] text-[#7A7267] mt-0.5">समग्र रिपोर्ट</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Bento 6: Official Circulars & Notices (4 cols / full-width) */}
        <div className="md:col-span-2 lg:col-span-4 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D4] mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#6B1D30]" />
              <h3 className="text-sm font-bold text-[#2D2A26]">
                Official Circulars & Notices / प्रशासनिक सूचनाएं
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}/admin/notifications`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B1D30] hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Post Notice
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href={`/${locale}/admin/notifications`}
                className="text-xs font-semibold text-[#7A7267] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {stats.recentNotices.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-[#7A7267]">No active circulars or announcements posted.</p>
              <Link
                href={`/${locale}/admin/notifications`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B1D30] hover:underline mt-1.5"
              >
                Create first announcement
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recentNotices.map((n) => (
                <div
                  key={n.id}
                  className="p-3 bg-[#F3EDE4]/30 rounded-sm border border-[#E8E0D4] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {n.isEmergency ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 text-red-800 border border-red-200 uppercase">
                          Urgent
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[#E8EDF2] text-[#3D5A80]">
                          Notice
                        </span>
                      )}
                      <span className="text-[10px] text-[#7A7267]">
                        {new Date(n.postedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#2D2A26] line-clamp-2 leading-snug">
                      {n.title}
                    </p>
                  </div>
                  <p className="text-[10px] text-[#7A7267] mt-2 pt-2 border-t border-[#E8E0D4]/60 capitalize">
                    Audience: {n.audience.toLowerCase().replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
