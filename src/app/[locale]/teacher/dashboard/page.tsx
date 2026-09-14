import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarCheck, BookOpen, UserCheck, AlertCircle, ArrowRight } from "lucide-react";

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
    <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
      {/* Header with maroon accent line */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#2D2A26] tracking-tight">
          नमस्ते, {teacher?.fullName || "शिक्षक"}
        </h1>
        <div className="w-12 h-1 bg-[#6B1D30] rounded-full mt-2 mb-2" />
        <p className="text-sm font-medium text-[#7A7267]">
          Academic Session:{" "}
          <span className="font-semibold text-[#2D2A26]">
            {activeSession?.label || "—"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Class Teacher Assignment */}
        <div className="bg-white p-6 border border-[#E8E0D4] rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#E8EDF2] text-[#3D5A80]">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#7A7267] uppercase tracking-wider">
                Class Assignment
              </h2>
              {className ? (
                <p className="text-xl font-bold text-[#2D2A26] mt-1">
                  Class {className} ({assignedSection.name})
                </p>
              ) : (
                <p className="text-sm text-[#7A7267] mt-1 italic">
                  No section assigned as class teacher
                </p>
              )}
            </div>
          </div>
          {className && (
            <div className="mt-6 pt-4 border-t border-[#E8E0D4]/60">
              <Link
                href={`/${locale}/teacher/my-classes`}
                className="text-xs font-semibold text-[#6B1D30] hover:underline flex items-center gap-1"
              >
                View class details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Daily Attendance Link */}
        <div className="bg-white p-6 border border-[#E8E0D4] rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#FBF5E5] text-[#B8860B]">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#7A7267] uppercase tracking-wider">
                Daily Attendance
              </h2>
              <p className="text-xl font-bold text-[#2D2A26] mt-1">
                उपस्थिति रजिस्टर
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#E8E0D4]/60">
            {className ? (
              <Link
                href={`/${locale}/teacher/attendance`}
                className="text-xs font-semibold text-[#6B1D30] hover:underline flex items-center gap-1"
              >
                Mark student attendance →
              </Link>
            ) : (
              <span className="text-xs text-[#7A7267] flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Class teachers only
              </span>
            )}
          </div>
        </div>

        {/* Marks Entry Link */}
        <div className="bg-white p-6 border border-[#E8E0D4] rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#E6F4F1] text-[#2A9D8F]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#7A7267] uppercase tracking-wider">
                Examinations
              </h2>
              <p className="text-xl font-bold text-[#2D2A26] mt-1">
                परीक्षा अंक प्रविष्टि
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#E8E0D4]/60">
            <Link
              href={`/${locale}/teacher/marks-entry`}
              className="text-xs font-semibold text-[#6B1D30] hover:underline flex items-center gap-1"
            >
              Enter student marks →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
