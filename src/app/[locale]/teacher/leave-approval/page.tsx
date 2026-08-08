import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { LeaveApprover } from "@/components/teacher/leave-approver";

export default async function TeacherLeaveApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  // 1. Fetch teacher record + class assignment
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classTeacherOf: { select: { id: true } },
    },
  });

  const assignedSectionIds = teacher?.classTeacherOf.map((s) => s.id) ?? [];

  if (assignedSectionIds.length === 0) {
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
            <h1 className="text-xl font-bold text-gray-900">Student Leaves / अवकाश प्रबंधन</h1>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong className="font-bold">Not a Class Teacher / कक्षा अध्यापक नहीं हैं:</strong>
            <p className="mt-1 leading-relaxed">
              You are currently not registered as a Class Teacher. Student leave approvals are restricted to the designated Class Teacher.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 2. Fetch student leave requests in these sections
  const requests = await prisma.leaveRequest.findMany({
    where: {
      applicantType: "STUDENT",
      student: {
        sectionId: { in: assignedSectionIds },
      },
    },
    include: {
      student: {
        select: {
          fullName: true,
          admissionNo: true,
          section: {
            include: { class: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
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
            छात्र अवकाश प्रार्थना पत्र
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and Approve Student Leave Requests</p>
        </div>
      </div>

      <LeaveApprover locale={locale} requests={requests} />
    </main>
  );
}
