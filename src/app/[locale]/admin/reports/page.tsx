import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  ReportsHub,
  ReportsStudentRow,
  ReportsAttendanceRow,
  ReportsAttendanceStudentRow,
  ReportCardRow,
} from "@/components/admin/reports-hub";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: {
      id: true,
      label: true,
      classes: {
        orderBy: { name: "asc" },
        include: {
          sections: {
            include: {
              students: {
                where: { isActive: true },
                select: {
                  id: true,
                  fullName: true,
                  admissionNo: true,
                  gender: true,
                  guardians: {
                    where: { relation: "FATHER" },
                    select: { fullName: true },
                    take: 1,
                  },
                },
                orderBy: { fullName: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const [totalStudents, totalTeachers] = await Promise.all([
    prisma.student.count({ where: { isActive: true } }),
    prisma.teacher.count(),
  ]);

  // Build student list for reports
  const students: ReportsStudentRow[] = [];
  const reportCardStudents: ReportCardRow[] = [];
  const classNames: string[] = [];

  if (session) {
    for (const cls of session.classes) {
      if (!classNames.includes(cls.name)) {
        classNames.push(cls.name);
      }
      for (const sec of cls.sections) {
        for (const s of sec.students) {
          students.push({
            id: s.id,
            fullName: s.fullName,
            admissionNo: s.admissionNo,
            className: cls.name,
            sectionName: sec.name,
            fatherName: s.guardians?.[0]?.fullName ?? null,
            gender: s.gender,
          });
          reportCardStudents.push({
            id: s.id,
            fullName: s.fullName,
            admissionNo: s.admissionNo,
            className: cls.name,
            sectionName: sec.name,
          });
        }
      }
    }
  }

  // Build attendance summary
  const attendanceSummary: ReportsAttendanceRow[] = [];
  const attendanceStudents: ReportsAttendanceStudentRow[] = [];

  if (session) {
    for (const cls of session.classes) {
      for (const sec of cls.sections) {
        const studentIds = sec.students.map((s) => s.id);
        if (studentIds.length === 0) {
          attendanceSummary.push({
            className: cls.name,
            sectionName: sec.name,
            totalStudents: 0,
            totalDaysMarked: 0,
            totalPresent: 0,
            percentage: 0,
          });
          continue;
        }

        // Count distinct days marked for this section
        const rawDays = await prisma.attendance.groupBy({
          by: ["date"],
          where: {
            sessionId: session.id,
            studentId: { in: studentIds },
          },
        });
        const totalDaysMarked = rawDays.length;

        // Count total present records
        const presentCount = await prisma.attendance.count({
          where: {
            sessionId: session.id,
            studentId: { in: studentIds },
            status: "PRESENT",
          },
        });

        const totalPossible = totalDaysMarked * studentIds.length;
        const percentage = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;

        attendanceSummary.push({
          className: cls.name,
          sectionName: sec.name,
          totalStudents: studentIds.length,
          totalDaysMarked,
          totalPresent: presentCount,
          percentage,
        });

        // Per-student attendance
        for (const s of sec.students) {
          const studentTotalDays = await prisma.attendance.count({
            where: {
              sessionId: session.id,
              studentId: s.id,
            },
          });
          const studentPresent = await prisma.attendance.count({
            where: {
              sessionId: session.id,
              studentId: s.id,
              status: "PRESENT",
            },
          });
          attendanceStudents.push({
            id: s.id,
            fullName: s.fullName,
            admissionNo: s.admissionNo,
            className: cls.name,
            totalDays: studentTotalDays,
            presentDays: studentPresent,
            percentage: studentTotalDays > 0 ? Math.round((studentPresent / studentTotalDays) * 100) : 0,
          });
        }
      }
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#2D2A26]">
          Reports / रिपोर्ट
        </h1>
        <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
          Generate and export institutional records for session{" "}
          <span className="font-semibold text-[#2D2A26]">
            {session?.label ?? "—"}
          </span>
        </p>
      </div>

      <ReportsHub
        locale={locale}
        sessionLabel={session?.label ?? "—"}
        totalStudents={totalStudents}
        totalTeachers={totalTeachers}
        students={students}
        classNames={classNames}
        attendanceSummary={attendanceSummary}
        attendanceStudents={attendanceStudents}
        reportCardStudents={reportCardStudents}
      />

      {!session && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          No academic session found. Set up a session from the Classes page
          before generating reports.
        </div>
      )}
    </main>
  );
}
