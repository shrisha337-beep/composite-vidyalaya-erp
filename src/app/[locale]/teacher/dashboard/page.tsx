import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarCheck, BookOpen, UserCheck, AlertCircle } from "lucide-react";

export default async function TeacherDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  // 1. Fetch teacher details along with class teacher settings
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classTeacherOf: {
        include: {
          class: {
            include: { session: true },
          },
        },
      },
    },
  });

  const activeSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { label: true },
  });

  const assignedSection = teacher?.classTeacherOf?.[0];
  const className = assignedSection?.class?.name;

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          नमस्ते, {teacher?.fullName || "शिक्षक"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome to your teacher dashboard for Session: <span className="font-semibold text-gray-700">{activeSession?.label || "—"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Class Teacher info card */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-md">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Class Teacher Assignment</h2>
            {className ? (
              <p className="text-lg font-bold text-gray-900 mt-1">
                Class {className} (Section {assignedSection.name})
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-1 italic">
                No class teacher assignment
              </p>
            )}
          </div>
        </div>

        {/* Daily Attendance Link card */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg flex items-start gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-md">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Attendance Status</h2>
            {className ? (
              <Link
                href={`/${locale}/teacher/attendance`}
                className="text-xs font-semibold text-orange-600 hover:underline inline-block mt-2"
              >
                Mark Attendance / उपस्थिति दर्ज करें →
              </Link>
            ) : (
              <span className="text-xs text-gray-400 block mt-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Class Teachers only
              </span>
            )}
          </div>
        </div>

        {/* Marks Entry Link card */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg flex items-start gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-md">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Student Grades</h2>
            <Link
              href={`/${locale}/teacher/marks-entry`}
              className="text-xs font-semibold text-green-600 hover:underline inline-block mt-2"
            >
              Enter Student Marks / परीक्षा अंक दर्ज करें →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
