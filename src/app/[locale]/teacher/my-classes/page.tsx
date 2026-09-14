import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

export default async function TeacherMyClassesPage({
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
        include: {
          class: true,
          students: {
            where: { isActive: true },
            orderBy: { fullName: "asc" },
            select: {
              id: true,
              admissionNo: true,
              fullName: true,
              gender: true,
            },
          },
        },
      },
      subjects: {
        include: {
          subject: {
            include: {
              class: true,
            },
          },
        },
      },
    },
  });

  const classTeacherSections = teacher?.classTeacherOf ?? [];
  const assignedSubjects = teacher?.subjects ?? [];

  // Get unique class IDs this teacher is assigned to via subjects
  const assignedClassIds = new Set(
    assignedSubjects.map((ts) => ts.subject.classId)
  );

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            My Classes / मेरी कक्षाएं
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Classes and students assigned to you.
          </p>
        </div>
      </div>

      {/* Class Teacher Sections */}
      {classTeacherSections.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Class Teacher Of
          </h2>
          {classTeacherSections.map((section) => (
            <div
              key={section.id}
              className="bg-white border border-gray-200 rounded-lg mb-4"
            >
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">
                    Class {section.class.name} — Section {section.name}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {section.students.length} students
                </span>
              </div>
              {section.students.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400 italic">
                  No students enrolled in this section.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-5 py-2 font-medium">#</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Adm. No.
                      </th>
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">
                        Gender
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {section.students.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {s.admissionNo}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          {s.fullName}
                        </td>
                        <td className="px-4 py-2 text-gray-500">{s.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subject Assignments */}
      {assignedSubjects.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Subject Assignments
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="text-left px-5 py-2.5 font-medium">
                    Subject
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assignedSubjects.map((ts) => (
                  <tr key={ts.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 font-medium text-gray-800">
                      {ts.subject.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      Class {ts.subject.class.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {classTeacherSections.length === 0 && assignedSubjects.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No classes or subjects assigned to you yet. Contact the
            administrator.
          </p>
        </div>
      )}
    </main>
  );
}
