import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Printer } from "lucide-react";
import {
  AdminAttendanceView,
  ClassAttendanceSummary,
} from "@/components/admin/admin-attendance-view";
import {
  AttendanceAnalytics,
  StudentAttendanceData,
  ClassSummaryData,
} from "@/components/admin/attendance-analytics";

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
              gender: true,
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

  // Build classesSummary matrix with gender breakdowns
  const classesSummary: ClassAttendanceSummary[] = [];

  for (const c of classes) {
    for (const sec of c.sections) {
      let presentCount = 0;
      let absentCount = 0;
      let markedCount = 0;
      let boysCount = 0;
      let boysPresent = 0;
      let girlsCount = 0;
      let girlsPresent = 0;

      const studentRosters = sec.students.map((s) => {
        const isBoy = s.gender === "MALE";
        const isGirl = s.gender === "FEMALE";
        if (isBoy) boysCount++;
        if (isGirl) girlsCount++;

        const status = attendanceMap.get(s.id) ?? "ABSENT";
        if (attendanceMap.has(s.id)) {
          markedCount++;
          if (status === "PRESENT") {
            presentCount++;
            if (isBoy) boysPresent++;
            if (isGirl) girlsPresent++;
          }
          if (status === "ABSENT") absentCount++;
        }
        return {
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          gender: s.gender,
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
        boysCount,
        boysPresent: isMarked ? boysPresent : 0,
        girlsCount,
        girlsPresent: isMarked ? girlsPresent : 0,
        isMarked,
        students: studentRosters,
      });
    }
  }

  // ─── Attendance Analytics Data ───────────────────────────────────
  const classNames = [...new Set(classes.map((c) => c.name))];

  // Daily attendance analytics data for the selected date
  const dailyClassSummary: ClassSummaryData[] = classesSummary.map((cs) => ({
    className: cs.className,
    sectionName: cs.sectionName,
    totalStudents: cs.totalStudents,
    totalDaysMarked: cs.isMarked ? 1 : 0,
    totalPresent: cs.presentCount,
    boysCount: cs.boysCount,
    boysPresent: cs.boysPresent,
    girlsCount: cs.girlsCount,
    girlsPresent: cs.girlsPresent,
  }));

  const dailyStudentData: StudentAttendanceData[] = [];
  for (const c of classes) {
    for (const sec of c.sections) {
      for (const s of sec.students) {
        const isMarked = attendanceMap.has(s.id);
        const status = attendanceMap.get(s.id);
        dailyStudentData.push({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          className: c.name,
          sectionName: sec.name,
          gender: s.gender,
          totalDays: isMarked ? 1 : 0,
          presentDays: status === "PRESENT" ? 1 : 0,
          dayStatus: status,
        });
      }
    }
  }

  // Session-wise analytics
  const sessionStudentData: StudentAttendanceData[] = [];
  const sessionClassSummary: ClassSummaryData[] = [];

  // Current month analytics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyStudentData: StudentAttendanceData[] = [];
  const monthlyClassSummary: ClassSummaryData[] = [];

  for (const c of classes) {
    for (const sec of c.sections) {
      const studentIds = sec.students.map((s) => s.id);
      const boyStudents = sec.students.filter((s) => s.gender === "MALE");
      const girlStudents = sec.students.filter((s) => s.gender === "FEMALE");
      const boyIds = boyStudents.map((s) => s.id);
      const girlIds = girlStudents.map((s) => s.id);

      if (studentIds.length === 0) {
        sessionClassSummary.push({
          className: c.name,
          sectionName: sec.name,
          totalStudents: 0,
          totalDaysMarked: 0,
          totalPresent: 0,
          boysCount: 0,
          boysPresent: 0,
          girlsCount: 0,
          girlsPresent: 0,
        });
        monthlyClassSummary.push({
          className: c.name,
          sectionName: sec.name,
          totalStudents: 0,
          totalDaysMarked: 0,
          totalPresent: 0,
          boysCount: 0,
          boysPresent: 0,
          girlsCount: 0,
          girlsPresent: 0,
        });
        continue;
      }

      // Session-wide: distinct days marked, overall present, boys present, girls present
      const [sessionDays, sessionPresent, sessionBoysPresent, sessionGirlsPresent] =
        await Promise.all([
          prisma.attendance.groupBy({
            by: ["date"],
            where: { sessionId: currentSession.id, studentId: { in: studentIds } },
          }),
          prisma.attendance.count({
            where: {
              sessionId: currentSession.id,
              studentId: { in: studentIds },
              status: "PRESENT",
            },
          }),
          boyIds.length > 0
            ? prisma.attendance.count({
                where: {
                  sessionId: currentSession.id,
                  studentId: { in: boyIds },
                  status: "PRESENT",
                },
              })
            : Promise.resolve(0),
          girlIds.length > 0
            ? prisma.attendance.count({
                where: {
                  sessionId: currentSession.id,
                  studentId: { in: girlIds },
                  status: "PRESENT",
                },
              })
            : Promise.resolve(0),
        ]);

      sessionClassSummary.push({
        className: c.name,
        sectionName: sec.name,
        totalStudents: studentIds.length,
        totalDaysMarked: sessionDays.length,
        totalPresent: sessionPresent,
        boysCount: boyIds.length,
        boysPresent: sessionBoysPresent,
        girlsCount: girlIds.length,
        girlsPresent: sessionGirlsPresent,
      });

      // Monthly: distinct days marked, overall present, boys present, girls present
      const [monthDays, monthPresent, monthBoysPresent, monthGirlsPresent] =
        await Promise.all([
          prisma.attendance.groupBy({
            by: ["date"],
            where: {
              sessionId: currentSession.id,
              studentId: { in: studentIds },
              date: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.attendance.count({
            where: {
              sessionId: currentSession.id,
              studentId: { in: studentIds },
              status: "PRESENT",
              date: { gte: monthStart, lte: monthEnd },
            },
          }),
          boyIds.length > 0
            ? prisma.attendance.count({
                where: {
                  sessionId: currentSession.id,
                  studentId: { in: boyIds },
                  status: "PRESENT",
                  date: { gte: monthStart, lte: monthEnd },
                },
              })
            : Promise.resolve(0),
          girlIds.length > 0
            ? prisma.attendance.count({
                where: {
                  sessionId: currentSession.id,
                  studentId: { in: girlIds },
                  status: "PRESENT",
                  date: { gte: monthStart, lte: monthEnd },
                },
              })
            : Promise.resolve(0),
        ]);

      monthlyClassSummary.push({
        className: c.name,
        sectionName: sec.name,
        totalStudents: studentIds.length,
        totalDaysMarked: monthDays.length,
        totalPresent: monthPresent,
        boysCount: boyIds.length,
        boysPresent: monthBoysPresent,
        girlsCount: girlIds.length,
        girlsPresent: monthGirlsPresent,
      });

      // Per-student data
      for (const s of sec.students) {
        const [sTotalDays, sPresent, mTotalDays, mPresent] = await Promise.all([
          prisma.attendance.count({
            where: { sessionId: currentSession.id, studentId: s.id },
          }),
          prisma.attendance.count({
            where: { sessionId: currentSession.id, studentId: s.id, status: "PRESENT" },
          }),
          prisma.attendance.count({
            where: {
              sessionId: currentSession.id,
              studentId: s.id,
              date: { gte: monthStart, lte: monthEnd },
            },
          }),
          prisma.attendance.count({
            where: {
              sessionId: currentSession.id,
              studentId: s.id,
              status: "PRESENT",
              date: { gte: monthStart, lte: monthEnd },
            },
          }),
        ]);

        sessionStudentData.push({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          className: c.name,
          sectionName: sec.name,
          gender: s.gender,
          totalDays: sTotalDays,
          presentDays: sPresent,
        });

        monthlyStudentData.push({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          className: c.name,
          sectionName: sec.name,
          gender: s.gender,
          totalDays: mTotalDays,
          presentDays: mPresent,
        });
      }
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
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

        <Link
          href={`/${locale}/admin/reports/attendance-print?date=${selectedDateStr}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-md shadow-xs transition-colors hover:brightness-110 shrink-0 self-start sm:self-auto"
          style={{ background: "#6B1D30" }}
        >
          <Printer className="h-4 w-4" />
          <span>Printable Register / उपस्थिति प्रिंट</span>
        </Link>
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
          dailyStudentData={dailyStudentData}
          dailyClassSummary={dailyClassSummary}
          selectedDate={selectedDateStr}
        />
      </div>
    </main>
  );
}
