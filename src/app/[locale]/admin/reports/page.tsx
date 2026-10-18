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

  // Build attendance summary — batched queries instead of per-student loop.
  // Previously ran ~600 sequential COUNT queries for 302 students (2 per student).
  // Now: 2 groupBy queries for the entire school + in-memory aggregation.
  const attendanceSummary: ReportsAttendanceRow[] = [];
  const attendanceStudents: ReportsAttendanceStudentRow[] = [];

  if (session) {
    // Collect all student IDs across all sections
    const allStudentIds = session.classes.flatMap((cls) =>
      cls.sections.flatMap((sec) => sec.students.map((s) => s.id))
    );

    // Two batched queries: per-student total days and per-student present days
    const [totalRows, presentRows, sectionDaysRows] = allStudentIds.length > 0
      ? await Promise.all([
          prisma.attendance.groupBy({
            by: ["studentId"],
            where: { sessionId: session.id, studentId: { in: allStudentIds } },
            _count: { _all: true },
          }),
          prisma.attendance.groupBy({
            by: ["studentId"],
            where: { sessionId: session.id, studentId: { in: allStudentIds }, status: "PRESENT" },
            _count: { _all: true },
          }),
          prisma.attendance.groupBy({
            by: ["studentId", "date"],
            where: { sessionId: session.id, studentId: { in: allStudentIds } },
          }),
        ])
      : [[], [], []];

    // Build lookup maps
    const totalMap = new Map<string, number>();
    for (const r of totalRows) totalMap.set(r.studentId, r._count._all);

    const presentMap = new Map<string, number>();
    for (const r of presentRows) presentMap.set(r.studentId, r._count._all);

    // Count distinct days per student (for totalDays per student)
    // and collect unique dates per section (for section-level totalDaysMarked)
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

        // Count distinct dates for this section from the groupBy result
        const sectionDates = new Set<string>();
        for (const r of sectionDaysRows) {
          if (studentIds.includes(r.studentId)) {
            sectionDates.add(r.date.toISOString());
          }
        }
        const totalDaysMarked = sectionDates.size;

        // Sum present counts across section students
        let sectionPresent = 0;
        for (const sid of studentIds) {
          sectionPresent += presentMap.get(sid) ?? 0;
        }

        const totalPossible = totalDaysMarked * studentIds.length;
        const percentage = totalPossible > 0 ? Math.round((sectionPresent / totalPossible) * 100) : 0;

        attendanceSummary.push({
          className: cls.name,
          sectionName: sec.name,
          totalStudents: studentIds.length,
          totalDaysMarked,
          totalPresent: sectionPresent,
          percentage,
        });

        // Per-student attendance from the maps (no extra queries)
        for (const s of sec.students) {
          const studentTotalDays = totalMap.get(s.id) ?? 0;
          const studentPresent = presentMap.get(s.id) ?? 0;
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
