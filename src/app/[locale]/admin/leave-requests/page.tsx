import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TeacherLeaveApprover } from "@/components/admin/teacher-leave-approver";

export default async function AdminLeaveRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  // Fetch all teacher leave requests
  const requests = await prisma.leaveRequest.findMany({
    where: {
      applicantType: "TEACHER",
    },
    include: {
      teacher: {
        select: {
          fullName: true,
          employeeCode: true,
          designation: true,
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
          href={`/${locale}/admin`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            शिक्षक अवकाश आवेदन
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and Process Teacher Leave Applications</p>
        </div>
      </div>

      <TeacherLeaveApprover locale={locale} requests={requests} />
    </main>
  );
}
