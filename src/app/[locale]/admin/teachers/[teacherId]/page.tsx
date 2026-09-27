import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeacherDetailView } from "@/components/admin/teacher-detail-view";
import { getTeacherCLBalance } from "@/app/actions/leave";

async function getTeacher(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { phone: true, isActive: true } },
      classTeacherOf: {
        include: { class: true },
        take: 1,
      },
    },
  });

  return teacher;
}

export default async function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ locale: string; teacherId: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale, teacherId } = await params;

  const teacher = await getTeacher(teacherId);
  if (!teacher) notFound();

  // Fetch current session class levels
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const classes = currentSession?.classes.map((c) => c.name) ?? ["1", "2", "3", "4", "5", "6", "7", "8"];
  const clBalance = await getTeacherCLBalance(teacher.id);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/teachers`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            शिक्षक विवरण एवं प्रबंधन
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Teacher Profile & Portal Settings</p>
        </div>
      </div>

      <TeacherDetailView
        locale={locale}
        teacher={teacher}
        classes={classes}
        clBalance={clBalance}
      />
    </main>
  );
}
