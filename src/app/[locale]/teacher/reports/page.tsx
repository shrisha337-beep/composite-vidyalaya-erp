import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, FileText, CalendarCheck, BookOpen } from "lucide-react";

export default async function TeacherReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      classTeacherOf: {
        include: { class: true },
      },
      subjects: {
        include: {
          subject: { include: { class: true } },
        },
      },
    },
  });

  const assignedSections = teacher?.classTeacherOf ?? [];
  const assignedSubjects = teacher?.subjects ?? [];

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
          <h1 className="text-xl font-bold text-gray-900">
            Reports / रिपोर्ट
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate reports for your assigned classes.
          </p>
        </div>
      </div>

      {assignedSections.length === 0 && assignedSubjects.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No classes or subjects assigned. Reports will be available once
            you&#39;re assigned to a class.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Attendance Report */}
          {assignedSections.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Attendance Summary
                  </h3>
                  <p className="text-xs text-gray-500">
                    Monthly attendance for your class sections.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedSections.map((section) => (
                  <span
                    key={section.id}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-sm text-xs font-medium"
                  >
                    Class {section.class.name} - {section.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Detailed attendance export coming soon.
              </p>
            </div>
          )}

          {/* Marks Summary */}
          {assignedSubjects.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-sm bg-blue-50 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Marks Summary
                  </h3>
                  <p className="text-xs text-gray-500">
                    Marks overview for your assigned subjects.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {assignedSubjects.map((ts) => (
                  <span
                    key={ts.id}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-sm text-xs font-medium"
                  >
                    {ts.subject.name} - Class {ts.subject.class.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Detailed marks export coming soon.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
