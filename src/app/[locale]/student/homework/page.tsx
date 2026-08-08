import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calendar, FileDown } from "lucide-react";

export default async function StudentHomeworkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  // 1. Fetch student profile linked to user
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      section: {
        include: {
          class: true,
        },
      },
    },
  });

  if (!student || !student.section) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          No class section assignment found for this profile. Please contact the administrator.
        </div>
      </main>
    );
  }

  // 2. Fetch homework assignments for subjects belonging to this class
  const homework = await prisma.homework.findMany({
    where: {
      subject: {
        classId: student.section.classId,
      },
    },
    include: {
      subject: { select: { name: true } },
    },
    orderBy: { assignedDate: "desc" },
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/student/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 animate-pulse-subtle"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            मेरा गृहकार्य / Homework
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Class {student.section.class.name} (Section {student.section.name}) Homework Registry
          </p>
        </div>
      </div>

      {/* Homework List */}
      {homework.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No homework assignments found</p>
          <p className="text-xs text-gray-400 mt-1">
            Excellent! You have no pending homework tasks assigned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homework.map((hw) => {
            const isOverdue = new Date(hw.dueDate) < new Date() && new Date(hw.dueDate).toDateString() !== new Date().toDateString();
            return (
              <div
                key={hw.id}
                className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-gray-50 pb-2 mb-3">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                      {hw.subject.name}
                    </span>
                    <span
                      className={[
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        isOverdue
                          ? "bg-red-50 text-red-700 border border-red-100"
                          : "bg-green-50 text-green-700 border border-green-100",
                      ].join(" ")}
                    >
                      {isOverdue ? "Overdue" : "Pending"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 mb-1.5">{hw.title}</h3>
                  {hw.description && (
                    <p className="text-xs text-gray-500 leading-relaxed mb-4 whitespace-pre-line">
                      {hw.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400 mt-auto">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="h-3 w-3" />
                    Due: {new Date(hw.dueDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  {hw.fileUrl && (
                    <a
                      href={hw.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Download Resource
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
