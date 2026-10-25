import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getSchoolBranding } from "@/lib/branding";
import {
  CalendarCheck,
  BookOpen,
  UserCheck,
  ArrowRight,
  ClipboardList,
  Bell,
  Clock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Fetch teacher details along with class teacher assignment
  const [teacher, activeSession, recentNotices] = await Promise.all([
    prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        classTeacherOf: {
          include: {
            class: {
              include: { session: true },
            },
          },
        },
      },
    }),
    prisma.academicSession.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    }),
    prisma.notice.findMany({
      where: {
        audience: { in: ["ALL", "TEACHERS"] },
      },
      orderBy: { postedAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        postedAt: true,
        isEmergency: true,
      },
    }),
  ]);

  const assignedSection = teacher?.classTeacherOf?.[0];
  const className = assignedSection?.class?.name;

  // Check if attendance is already marked today for the assigned section
  let attendanceMarkedCount = 0;
  if (assignedSection) {
    attendanceMarkedCount = await prisma.attendance.count({
      where: {
        student: { sectionId: assignedSection.id },
        date: { gte: today, lt: tomorrow },
      },
    });
  }

  const todayEnglish = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E8E0D4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6B1D30] bg-[#6B1D30]/10 px-2 py-0.5 rounded-sm">
              Faculty Desk
            </span>
            <span className="text-xs text-[#7A7267]">शिक्षक पोर्टल</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D2A26] tracking-tight mt-1">
            नमस्ते, {teacher?.fullName || "शिक्षक"}
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold text-[#2D2A26]">{todayEnglish}</p>
          <p className="text-xs text-[#7A7267]">
            Academic Session: {activeSession?.label || "2026-2027"}
          </p>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Bento 1: Teacher Profile & Class Assignment (2 cols on desktop) */}
        <div className="md:col-span-2 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-[#6B1D30] text-white flex items-center justify-center font-bold text-base shrink-0">
                  {teacher?.fullName?.charAt(0) || "T"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2D2A26] leading-tight">
                    {teacher?.fullName || "Faculty Member"}
                  </h2>
                  <p className="text-xs text-[#7A7267] font-medium mt-0.5">
                    {teacher?.designation || "Assistant Teacher"} {teacher?.employeeCode ? `(ID: ${teacher.employeeCode})` : ""}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-sm bg-[#F3EDE4] text-[#2D2A26] border border-[#E8E0D4] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" /> Authorized Staff
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#E8E0D4]">
              <div className="p-2.5 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Class Teacher Of</p>
                <p className="text-sm font-bold text-[#2D2A26] mt-0.5">
                  {className ? `Class ${className} (${assignedSection.name})` : "Not Assigned"}
                </p>
              </div>

              <div className="p-2.5 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Session</p>
                <p className="text-sm font-bold text-[#2D2A26] mt-0.5">
                  {activeSession?.label || "2026-2027"}
                </p>
              </div>

              <div className="p-2.5 bg-[#F3EDE4]/50 rounded-sm border border-[#E8E0D4]/60 col-span-2 sm:col-span-1">
                <p className="text-[10px] uppercase font-bold text-[#7A7267]">Today Register</p>
                <p className="text-sm font-bold text-[#2D2A26] mt-0.5">
                  {attendanceMarkedCount > 0 ? (
                    <span className="text-emerald-700">Marked ({attendanceMarkedCount})</span>
                  ) : (
                    <span className="text-amber-700">Pending</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4] flex items-center justify-between text-xs text-[#7A7267]">
            <span>{getSchoolBranding().governanceShort}</span>
            {className && (
              <Link
                href={`/${locale}/teacher/my-classes`}
                className="text-[#6B1D30] font-semibold hover:underline flex items-center gap-1"
              >
                View Class Students <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Bento 2: Attendance Register Shortcut (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-[#3D5A80]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Daily Attendance
                </h3>
              </div>
              <span className="text-[10px] text-[#7A7267]">Register</span>
            </div>

            <div className="my-2">
              <h4 className="text-lg font-bold text-[#2D2A26]">
                दैनिक छात्र उपस्थिति
              </h4>
              <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
                {className
                  ? `Mark and review daily attendance for Class ${className} (${assignedSection.name}).`
                  : "Assigned class teachers can submit daily attendance rolls."}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            {className ? (
              <Link
                href={`/${locale}/teacher/attendance`}
                className="w-full py-2 px-3 rounded-sm bg-[#6B1D30] hover:bg-[#581726] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                Mark Attendance <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-xs text-[#7A7267] italic block text-center py-1">
                Class teacher assignment required
              </span>
            )}
          </div>
        </div>

        {/* Bento 3: Examination Marks Entry (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#2A9D8F]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Marks Entry
                </h3>
              </div>
              <span className="text-[10px] text-[#7A7267]">Exams</span>
            </div>

            <div className="my-2">
              <h4 className="text-lg font-bold text-[#2D2A26]">
                परीक्षा मूल्यांकन
              </h4>
              <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
                Enter and update student marks for Quarterly, Half-Yearly, and Annual assessments.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            <Link
              href={`/${locale}/teacher/marks-entry`}
              className="w-full py-2 px-3 rounded-sm bg-[#F3EDE4] hover:bg-[#E8E0D4] text-[#2D2A26] text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-[#E8E0D4]"
            >
              Enter Marks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 4: Teacher Leave & Services (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#B8860B]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Teacher Leave
                </h3>
              </div>
              <span className="text-[10px] text-[#7A7267]">Service</span>
            </div>

            <div className="my-2">
              <h4 className="text-lg font-bold text-[#2D2A26]">
                अवकाश आवेदन
              </h4>
              <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
                Apply for Casual, Medical, or Duty Leave and view approval status by Principal.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            <Link
              href={`/${locale}/teacher/leaves`}
              className="w-full py-2 px-3 rounded-sm bg-[#F3EDE4] hover:bg-[#E8E0D4] text-[#2D2A26] text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-[#E8E0D4]"
            >
              My Leave Requests <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 5: Homework & Tasks (1 col) */}
        <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#E76F51]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A7267]">
                  Homework
                </h3>
              </div>
              <span className="text-[10px] text-[#7A7267]">Tasks</span>
            </div>

            <div className="my-2">
              <h4 className="text-lg font-bold text-[#2D2A26]">
                गृहकार्य प्रबंधन
              </h4>
              <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
                Assign daily homework tasks and instructions for your teaching subjects.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E8E0D4]">
            <Link
              href={`/${locale}/teacher/homework`}
              className="w-full py-2 px-3 rounded-sm bg-[#F3EDE4] hover:bg-[#E8E0D4] text-[#2D2A26] text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-[#E8E0D4]"
            >
              Manage Homework <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Bento 6: Staff Circulars & Notices (3 cols / full width) */}
        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D4] mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#6B1D30]" />
              <h3 className="text-sm font-bold text-[#2D2A26]">
                Staff Circulars & Official Announcements / विभागीय सूचनाएं
              </h3>
            </div>
            <span className="text-xs text-[#7A7267]">Notice Board</span>
          </div>

          {recentNotices.length === 0 ? (
            <p className="text-xs text-[#7A7267] py-4 text-center">
              No staff circulars or notices posted.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentNotices.map((n) => (
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
