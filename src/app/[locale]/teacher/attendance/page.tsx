import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AttendanceView } from "@/components/teacher/attendance-view";

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
  await requireRole(["TEACHER"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const session = await requireRole(["TEACHER"]);
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

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
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
    </main>
  );
}
