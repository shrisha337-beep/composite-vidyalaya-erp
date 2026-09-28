import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import {
  AdminAttendanceView,
  ClassAttendanceSummary,
} from "@/components/admin/admin-attendance-view";
import { AttendanceAnalytics } from "@/components/admin/attendance-analytics";

export default async function AdminAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const { date: dateParam } = await searchParams;

  // Format today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];
  const selectedDateStr = dateParam ?? todayStr;
  const selectedDate = new Date(selectedDateStr);

  // Active academic session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  if (!currentSession) {
    return (
      <main className="flex-1 p-6 lg:p-8 max-w-5xl">
        <h1 className="text-xl font-bold text-gray-900">Attendance Overview</h1>
        <p className="text-sm text-gray-500 mt-2">No active academic session found.</p>
      </main>
    );
  }

  // Fetch all sections in current session with students & class teacher
  const classes = await prisma.class.findMany({
    where: { sessionId: currentSession.id },
    orderBy: { name: "asc" },
    include: {
      sections: {
        include: {
          classTeacher: { select: { fullName: true } },
          students: {
            where: { isActive: true },
            select: {
              id: true,
              fullName: true,
              admissionNo: true,
            },
            orderBy: { fullName: "asc" },
          },
        },
      },
    },
  });

  // Fetch all attendance logs for the selected date
  const attendanceLogs = await prisma.attendance.findMany({
    where: {
      date: selectedDate,
      sessionId: currentSession.id,
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  const attendanceMap = new Map<string, "PRESENT" | "ABSENT">();
  attendanceLogs.forEach((log) => {
    if (log.status === "PRESENT" || log.status === "ABSENT") {
      attendanceMap.set(log.studentId, log.status);
    }
  });

  // Build classesSummary matrix
  const classesSummary: ClassAttendanceSummary[] = [];

  for (const c of classes) {
    for (const sec of c.sections) {
      let presentCount = 0;
      let absentCount = 0;
      let markedCount = 0;

      const studentRosters = sec.students.map((s) => {
        const status = attendanceMap.get(s.id) ?? "ABSENT";
        if (attendanceMap.has(s.id)) {
          markedCount++;
          if (status === "PRESENT") presentCount++;
          if (status === "ABSENT") absentCount++;
        }
        return {
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          status,
        };
      });

      const isMarked = sec.students.length > 0 && markedCount > 0;

      classesSummary.push({
        sectionId: sec.id,
        className: c.name,
        sectionName: sec.name,
        classTeacherName: sec.classTeacher?.fullName ?? null,
        totalStudents: sec.students.length,
        presentCount,
        absentCount: isMarked ? absentCount : sec.students.length,
        isMarked,
        students: studentRosters,
      });
    }
  }

  // ─── Attendance Analytics Data ───────────────────────────────────
  const classNames = [...new Set(classes.map((c) => c.name))];

  // Session-wise analytics
  const sessionStudentData: {
    id: string;
    fullName: string;
    admissionNo: string;
    className: string;
    sectionName: string;
    totalDays: number;
    presentDays: number;
  }[] = [];

  const sessionClassSummary: {
    className: string;
    sectionName: string;
    totalStudents: number;
    totalDaysMarked: number;
    totalPresent: number;
  }[] = [];

  // Current month analytics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyStudentData: typeof sessionStudentData = [];
  const monthlyClassSummary: typeof sessionClassSummary = [];

  for (const c of classes) {
    for (const sec of c.sections) {
      const studentIds = sec.students.map((s) => s.id);

      if (studentIds.length === 0) {
        sessionClassSummary.push({
          className: c.name,
          sectionName: sec.name,
          totalStudents: 0,
          totalDaysMarked: 0,
          totalPresent: 0,
        });
        monthlyClassSummary.push({
          className: c.name,
          sectionName: sec.name,
          totalStudents: 0,
          totalDaysMarked: 0,
          totalPresent: 0,
        });
        continue;
      }

      // Session-wide: distinct days marked
      const sessionDays = await prisma.attendance.groupBy({
        by: ["date"],
        where: { sessionId: currentSession.id, studentId: { in: studentIds } },
      });

      const sessionPresent = await prisma.attendance.count({
        where: {
          sessionId: currentSession.id,
          studentId: { in: studentIds },
          status: "PRESENT",
        },
      });

      sessionClassSummary.push({
        className: c.name,
        sectionName: sec.name,
        totalStudents: studentIds.length,
        totalDaysMarked: sessionDays.length,
        totalPresent: sessionPresent,
      });

      // Monthly: distinct days marked
      const monthDays = await prisma.attendance.groupBy({
        by: ["date"],
        where: {
          sessionId: currentSession.id,
          studentId: { in: studentIds },
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      const monthPresent = await prisma.attendance.count({
        where: {
          sessionId: currentSession.id,
          studentId: { in: studentIds },
          status: "PRESENT",
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      monthlyClassSummary.push({
        className: c.name,
        sectionName: sec.name,
        totalStudents: studentIds.length,
        totalDaysMarked: monthDays.length,
        totalPresent: monthPresent,
      });

      // Per-student data
      for (const s of sec.students) {
        // Session
        const sTotalDays = await prisma.attendance.count({
          where: { sessionId: currentSession.id, studentId: s.id },
        });
        const sPresent = await prisma.attendance.count({
          where: { sessionId: currentSession.id, studentId: s.id, status: "PRESENT" },
        });
        sessionStudentData.push({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          className: c.name,
          sectionName: sec.name,
          totalDays: sTotalDays,
          presentDays: sPresent,
        });

        // Monthly
        const mTotalDays = await prisma.attendance.count({
          where: {
            sessionId: currentSession.id,
            studentId: s.id,
            date: { gte: monthStart, lte: monthEnd },
          },
        });
        const mPresent = await prisma.attendance.count({
          where: {
            sessionId: currentSession.id,
            studentId: s.id,
            status: "PRESENT",
            date: { gte: monthStart, lte: monthEnd },
          },
        });
        monthlyStudentData.push({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          className: c.name,
          sectionName: sec.name,
          totalDays: mTotalDays,
          presentDays: mPresent,
        });
      }
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-gray-600" />
            School Attendance Register / विद्यालय उपस्थिति रजिस्टर
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor and inspect school-wide student attendance logs across all classes
          </p>
        </div>
      </div>

      <AdminAttendanceView
        locale={locale}
        selectedDate={selectedDateStr}
        classesSummary={classesSummary}
      />

      {/* Attendance Analytics Section */}
      <div className="mt-6">
        <AttendanceAnalytics
          studentData={sessionStudentData}
          classSummary={sessionClassSummary}
          classNames={classNames}
          monthlyStudentData={monthlyStudentData}
          monthlyClassSummary={monthlyClassSummary}
        />
      </div>
    </main>
  );
}
