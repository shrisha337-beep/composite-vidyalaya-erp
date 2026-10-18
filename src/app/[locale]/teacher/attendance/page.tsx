import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AttendanceView } from "@/components/teacher/attendance-view";
import {
  AttendanceAnalytics,
  type StudentAttendanceData,
  type ClassSummaryData,
} from "@/components/admin/attendance-analytics";
import { getCurrentSession } from "@/lib/data/academic-session";
import { buildPeriodAttendanceAnalytics } from "@/lib/attendance-analytics";

async function getTeacherClassInfo(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      classTeacherOf: {
        include: {
          class: true,
        },
      },
    },
  });

  return teacher;
}

export default async function TeacherAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const teacher = await getTeacherClassInfo(session.user.id);

  const assignedSection = teacher?.classTeacherOf?.[0];

  if (!assignedSection) {
    return (
      <main className="flex-1 p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href={`/${locale}/teacher/dashboard`}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mark Attendance / उपस्थिति</h1>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong className="font-bold">Not a Class Teacher / कक्षा अध्यापक नहीं हैं:</strong>
            <p className="mt-1 leading-relaxed">
              You are currently not registered as a Class Teacher. Daily attendance can only be marked by the designated Class Teacher for each class level.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Resolve target date (defaults to today's date in local time)
  const todayStr = new Date().toISOString().split("T")[0];
  const dateString = sparams.date ?? todayStr;
  const attendanceDate = new Date(dateString);

  // Fetch all active students in this section
  const rawStudents = await prisma.student.findMany({
    where: {
      isActive: true,
      sectionId: assignedSection.id,
    },
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      gender: true,
      attendances: {
        where: {
          date: attendanceDate,
        },
        select: {
          status: true,
        },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  const studentsList = rawStudents.map((s) => ({
    id: s.id,
    admissionNo: s.admissionNo,
    fullName: s.fullName,
    gender: s.gender,
    currentStatus: s.attendances?.[0]?.status || null,
  }));

  // ─── Attendance Analytics for Teacher ─────────────────────────────
  const currentSession = await getCurrentSession();

  const classNames = [assignedSection.class.name];
  const boyStudents = rawStudents.filter((s) => s.gender === "MALE");
  const girlStudents = rawStudents.filter((s) => s.gender === "FEMALE");

  // Daily data — computed from already-fetched attendance records (no extra queries)
  const boysPresentToday = boyStudents.filter(
    (s) => s.attendances?.[0]?.status === "PRESENT"
  ).length;
  const girlsPresentToday = girlStudents.filter(
    (s) => s.attendances?.[0]?.status === "PRESENT"
  ).length;
  const totalPresentToday = boysPresentToday + girlsPresentToday;
  const isMarkedToday = rawStudents.some((s) => s.attendances && s.attendances.length > 0);

  const dailyClassSummary: ClassSummaryData[] = [
    {
      className: assignedSection.class.name,
      sectionName: assignedSection.name,
      totalStudents: rawStudents.length,
      totalDaysMarked: isMarkedToday ? 1 : 0,
      totalPresent: totalPresentToday,
      boysCount: boyStudents.length,
      boysPresent: isMarkedToday ? boysPresentToday : 0,
      girlsCount: girlStudents.length,
      girlsPresent: isMarkedToday ? girlsPresentToday : 0,
    },
  ];

  const dailyStudentData: StudentAttendanceData[] = rawStudents.map((s) => {
    const status = s.attendances?.[0]?.status;
    return {
      id: s.id,
      fullName: s.fullName,
      admissionNo: s.admissionNo,
      className: assignedSection.class.name,
      sectionName: assignedSection.name,
      gender: s.gender,
      totalDays: status ? 1 : 0,
      presentDays: status === "PRESENT" ? 1 : 0,
      dayStatus: status,
    };
  });

  // Session-wise + current-month analytics — one parallel query wave
  // via the batched helper (replaces the per-student loop that was
  // running ~140 sequential COUNT queries for 35 students).
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const {
    sessionStudentData,
    sessionClassSummary,
    monthlyStudentData,
    monthlyClassSummary,
  } = await buildPeriodAttendanceAnalytics(
    currentSession?.id ?? null,
    [
      {
        className: assignedSection.class.name,
        sectionName: assignedSection.name,
        students: rawStudents,
      },
    ],
    monthStart,
    monthEnd
  );

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            दैनिक छात्र उपस्थिति
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily Student Attendance Register</p>
        </div>
      </div>

      <AttendanceView
        locale={locale}
        sectionId={assignedSection.id}
        className={assignedSection.class.name}
        sectionName={assignedSection.name}
        dateString={dateString}
        students={studentsList}
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
          selectedDate={dateString}
        />
      </div>
    </main>
  );
}
