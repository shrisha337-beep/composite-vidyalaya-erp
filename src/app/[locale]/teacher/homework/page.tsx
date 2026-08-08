import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TeacherHomeworkList } from "@/components/teacher/homework-list";

export default async function TeacherHomeworkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  // Fetch homework assigned by this teacher in the active session
  const activeSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  const homework = await prisma.homework.findMany({
    where: {
      assignedById: session.user.id,
      subject: {
        class: {
          sessionId: activeSession?.id ?? "",
        },
      },
    },
    include: {
      subject: {
        select: {
          name: true,
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { assignedDate: "desc" },
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            गृहकार्य असाइनमेंट
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Assign and Manage Student Homework</p>
        </div>
        <div>
          <Link
            href="homework/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium text-white transition-colors"
            style={{ background: "hsl(var(--primary))" }}
          >
            <Plus className="h-4 w-4" />
            Assign Homework
          </Link>
        </div>
      </div>

      <TeacherHomeworkList locale={locale} homework={homework} />
    </main>
  );
}
