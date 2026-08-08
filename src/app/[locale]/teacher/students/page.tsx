import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";

async function getStudentsForClass(classVal: string) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  if (!session || !classVal) return [];

  const rawStudents = await prisma.student.findMany({
    where: {
      isActive: true,
      section: {
        class: {
          name: classVal,
          sessionId: session.id,
        },
      },
    },
    include: {
      guardians: {
        where: { relation: "FATHER" },
        select: { fullName: true },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return rawStudents.map((s) => ({
    id: s.id,
    admissionNo: s.admissionNo,
    fullName: s.fullName,
    gender: s.gender,
    fatherName: s.guardians[0]?.fullName ?? "—",
    phone: s.mobileNumber ?? "—",
  }));
}

export default async function TeacherStudentsPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ class?: string }>;
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["TEACHER"]);
  const sparams = await searchParams;
  const { locale } = await params;
  const classFilter = sparams.class ?? "";

  // 1. Fetch current active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    include: {
      classes: {
        select: { name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!currentSession) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          No current active session found. Please contact the administrator.
        </div>
      </main>
    );
  }

  const classes = currentSession.classes.map((c) => c.name);
  const students = await getStudentsForClass(classFilter);

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students List / छात्र सूची</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Academic Session: <span className="font-semibold text-gray-700">{currentSession.label}</span>
          </p>
        </div>
      </div>

      {/* Class Selector Dropdown */}
      <form method="GET" className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Select Class / कक्षा चुनें
          </label>
          <select
            name="class"
            defaultValue={classFilter}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
          >
            <option value="">Choose Class...</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded text-sm font-medium text-white transition-colors"
          style={{ background: "hsl(var(--primary))" }}
        >
          View Students
        </button>
      </form>

      {/* Students Table */}
      {classFilter && students.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No students found in Class {classFilter} yet.</p>
        </div>
      ) : classFilter ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Adm No</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Gender</th>
                  <th className="py-2.5 px-4">Father's Name</th>
                  <th className="py-2.5 px-4">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                      {s.admissionNo}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-800">
                      {s.fullName}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600 capitalize">
                      {s.gender.toLowerCase()}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{s.fatherName}</td>
                    <td className="py-2.5 px-4 text-gray-600 font-mono text-xs">{s.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-sm text-gray-400">
          Select a class from the dropdown above to view its student roster.
        </div>
      )}
    </main>
  );
}
