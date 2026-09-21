import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarksEntryView } from "@/components/teacher/marks-entry-view";
import { redirect } from "next/navigation";

export default async function TeacherMarksEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ class?: string; subjectId?: string; term?: string }>;
}) {
  await requireRole(["TEACHER"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const classFilter = sparams.class ?? "";
  const subjectId = sparams.subjectId ?? "";
  const term = sparams.term ?? "";

  // 1. Fetch current active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { name: true, id: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!currentSession) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          No current active session found. Please contact the administrator.
        </div>
      </main>
    );
  }

  const classesList = currentSession.classes.map((c) => c.name);

  // 2. Fetch subjects for selected class
  let subjects: { id: string; name: string }[] = [];
  if (classFilter) {
    const selectedClassObj = currentSession.classes.find((c) => c.name === classFilter);
    if (selectedClassObj) {
      subjects = await prisma.subject.findMany({
        where: { classId: selectedClassObj.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }
  }

  // 3. Fetch students and existing marks if filters are set
  let students: any[] = [];
  if (classFilter && subjectId && term) {
    const rawStudents = await prisma.student.findMany({
      where: {
        isActive: true,
        section: {
          class: {
            name: classFilter,
            sessionId: currentSession.id,
          },
        },
      },
      select: {
        id: true,
        admissionNo: true,
        fullName: true,
        gender: true,
        marks: {
          where: {
            subjectId,
            sessionId: currentSession.id,
            examTerm: term as any,
          },
          select: {
            marksObtained: true,
          },
          take: 1,
        },
      },
      orderBy: { fullName: "asc" },
    });

    students = rawStudents.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.fullName,
      gender: s.gender,
      currentMarks: s.marks?.[0]?.marksObtained ?? null,
    }));
  }

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
            परीक्षा अंक प्रविष्टि
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Student Academic Grades & Marks Entry</p>
        </div>
      </div>

      <MarksEntryView
        locale={locale}
        classes={classesList}
        subjects={subjects}
        students={students}
        selectedClass={classFilter}
        selectedSubjectId={subjectId}
        selectedTerm={term as any}
      />
    </main>
  );
}
