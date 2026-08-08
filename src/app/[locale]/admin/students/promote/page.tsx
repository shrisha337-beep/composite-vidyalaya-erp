import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PromoteStudentsView } from "@/components/admin/promote-students-view";
import { redirect } from "next/navigation";

export default async function PromoteStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sourceClass?: string; targetSession?: string; targetClass?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const sparams = await searchParams;

  const sourceClass = sparams.sourceClass ?? "";
  const targetSession = sparams.targetSession ?? "";
  const targetClass = sparams.targetClass ?? "";

  // 1. Fetch current active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!currentSession) {
    redirect(`/${locale}/admin/classes?error=${encodeURIComponent(
      "Please set up the current academic session first."
    )}`);
  }

  // 2. Fetch all academic sessions (to select target session)
  const sessions = await prisma.academicSession.findMany({
    select: { id: true, label: true },
    orderBy: { label: "desc" },
  });

  // 3. Fetch students in source class under current session
  let students: any[] = [];
  if (sourceClass) {
    const rawStudents = await prisma.student.findMany({
      where: {
        isActive: true,
        section: {
          class: {
            name: sourceClass,
            sessionId: currentSession.id,
          },
        },
      },
      select: {
        id: true,
        admissionNo: true,
        fullName: true,
        guardians: {
          where: { relation: "FATHER" },
          select: { fullName: true },
          take: 1,
        },
      },
      orderBy: { fullName: "asc" },
    });

    students = rawStudents.map((s) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      fullName: s.fullName,
      fatherName: s.guardians[0]?.fullName ?? "—",
    }));
  }

  const classesList = currentSession.classes.map((c) => c.name);

  // Default values for target session and class if not selected
  const defaultTargetSessionId = targetSession || (sessions.length > 0 ? sessions[0].id : "");
  // Default target class is typically source class + 1 (capped at 8)
  const defaultTargetClass = targetClass || (sourceClass ? String(Math.min(8, Number(sourceClass) + 1)) : "1");

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/students`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            कक्षा प्रोन्नति प्रबंधन
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Bulk Class Promotion Management</p>
        </div>
      </div>

      <PromoteStudentsView
        locale={locale}
        currentSessionLabel={currentSession.label}
        sessions={sessions}
        classes={classesList}
        students={students}
        selectedSourceClass={sourceClass}
        selectedTargetSessionId={defaultTargetSessionId}
        selectedTargetClass={defaultTargetClass}
      />
    </main>
  );
}
