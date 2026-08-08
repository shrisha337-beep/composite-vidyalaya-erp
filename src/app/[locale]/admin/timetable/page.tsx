import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TimetableManager } from "@/components/admin/timetable-manager";

export default async function AdminTimetablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const classFilter = sparams.class ?? "";

  // 1. Fetch current active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { id: true, name: true },
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

  // 2. Fetch context if class is selected
  let subjects: { id: string; name: string }[] = [];
  let teachers: { id: string; fullName: string }[] = [];
  let sectionId = "";
  let slots: any[] = [];

  if (classFilter) {
    const selectedClassObj = currentSession.classes.find((c) => c.name === classFilter);

    if (selectedClassObj) {
      // Find section A
      const section = await prisma.section.findFirst({
        where: {
          classId: selectedClassObj.id,
          name: "A",
        },
        select: { id: true },
      });

      if (section) {
        sectionId = section.id;

        // Fetch subjects
        subjects = await prisma.subject.findMany({
          where: { classId: selectedClassObj.id },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });

        // Fetch teachers
        teachers = await prisma.teacher.findMany({
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        });

        // Fetch current slots
        slots = await prisma.timetableSlot.findMany({
          where: { sectionId: section.id },
          include: {
            subject: { select: { name: true } },
            teacher: { select: { fullName: true } },
          },
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" },
          ],
        });
      }
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            समय सारणी प्रबंधन
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">School Timetable & Period Management</p>
        </div>
      </div>

      <TimetableManager
        locale={locale}
        classes={classesList}
        subjects={subjects}
        teachers={teachers}
        selectedClass={classFilter}
        sectionId={sectionId}
        slots={slots}
      />
    </main>
  );
}
