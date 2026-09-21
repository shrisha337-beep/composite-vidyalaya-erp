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
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-sm text-[#7A7267] hover:text-[#2D2A26] hover:bg-[#F3EDE4] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D2A26]">
            My Classes / मेरी कक्षाएं
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
            Classes and students assigned to your profile
          </p>
        </div>
      </div>

      {/* Class Teacher Sections */}
      {classTeacherSections.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A534A] mb-3">
            Class Teacher Of
          </h2>
          {classTeacherSections.map((section) => (
            <div
              key={section.id}
              className="bg-white border border-[#E8E0D4] rounded-sm mb-4 shadow-xs overflow-hidden"
            >
              <div className="px-4 sm:px-5 py-3 border-b border-[#E8E0D4] flex items-center justify-between bg-[#F8F5F0]">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#6B1D30]" />
                  <span className="text-sm font-bold text-[#2D2A26]">
                    Class {section.class.name} - Section {section.name}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-sm bg-white border border-[#E8E0D4] text-[#7A7267]">
                  {section.students.length} students
                </span>
              </div>
              {section.students.length === 0 ? (
                <p className="px-5 py-4 text-sm text-[#7A7267] italic">
                  No students enrolled in this section.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[380px]">
                    <thead>
                      <tr className="bg-[#F8F5F0]/60 text-xs font-semibold text-[#5A534A] uppercase tracking-wider border-b border-[#E8E0D4]">
                        <th className="text-left px-4 sm:px-5 py-2.5 w-12">#</th>
                        <th className="text-left px-4 py-2.5">Adm. No.</th>
                        <th className="text-left px-4 py-2.5">Name</th>
                        <th className="text-left px-4 py-2.5">Gender</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E0D4]">
                      {section.students.map((s, i) => (
                        <tr key={s.id} className="hover:bg-[#F3EDE4]/40 transition-colors">
                          <td className="px-4 sm:px-5 py-2.5 text-xs text-[#7A7267]">{i + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-[#7A7267]">
                            {s.admissionNo}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-[#2D2A26]">
                            {s.fullName}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[#7A7267] capitalize">{s.gender.toLowerCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subject Assignments */}
      {assignedSubjects.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A534A] mb-3">
            Subject Assignments
          </h2>
          <div className="bg-white border border-[#E8E0D4] rounded-sm shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F5F0] text-xs font-semibold text-[#5A534A] uppercase tracking-wider border-b border-[#E8E0D4]">
                    <th className="text-left px-4 sm:px-5 py-2.5">Subject</th>
                    <th className="text-left px-4 py-2.5">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D4]">
                  {assignedSubjects.map((ts) => (
                    <tr key={ts.id} className="hover:bg-[#F3EDE4]/40 transition-colors">
                      <td className="px-4 sm:px-5 py-2.5 font-medium text-[#2D2A26]">
                        {ts.subject.name}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#7A7267]">
                        Class {ts.subject.class.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {classTeacherSections.length === 0 && assignedSubjects.length === 0 && (
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-8 text-center shadow-xs">
          <Users className="h-8 w-8 text-[#A89F91] mx-auto mb-3" />
          <p className="text-sm text-[#7A7267]">
            No classes or subjects assigned to you yet. Contact the administrator.
          </p>
        </div>
      )}
    </main>
  );
}
