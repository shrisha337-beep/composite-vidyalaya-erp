import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeacherLeavePanel } from "@/components/teacher/leave-panel";

export default async function TeacherLeavePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  // Find Teacher linked to user
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  let pastRequests: any[] = [];
  if (teacher) {
    pastRequests = await prisma.leaveRequest.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "desc" },
    });
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            अवकाश प्रार्थना पत्र (छुट्टी)
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">My Leave Applications & Registry</p>
        </div>
      </div>

      <TeacherLeavePanel locale={locale} pastRequests={pastRequests} />
    </main>
  );
}
