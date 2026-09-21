import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { UserCheck, Plus, Search, ShieldAlert } from "lucide-react";

async function getTeachers(q: string) {
  const where = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { employeeCode: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const teachers = await prisma.teacher.findMany({
    where,
    include: {
      user: { select: { phone: true, isActive: true } },
      classTeacherOf: {
        include: { class: true },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return teachers;
}

export default async function AdminTeachersPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ q?: string }>;
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const sparams = await searchParams;
  const { locale } = await params;
  const q = sparams.q ?? "";

  const teachers = await getTeachers(q);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#2D2A26]">Teachers Setup / शिक्षक प्रबंधन</h1>
          <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
            {teachers.length} teacher{teachers.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div>
          <Link
            href="teachers/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm text-xs font-semibold text-white bg-[#6B1D30] hover:bg-[#541624] transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Teacher
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <form method="GET" className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or employee code..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
        {q && (
          <Link
            href="teachers"
            className="px-4 py-2 rounded-md text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      {teachers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <UserCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            {q ? "No teachers found" : "No teachers yet"}
          </p>
          <p className="text-xs text-gray-400">
            {q ? "Try clearing search filter." : "Click Add Teacher to set up a new teacher."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-[#E8E0D4] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[650px]">
              <thead>
                <tr className="border-b border-[#E8E0D4] bg-[#F8F5F0]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Employee Code
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Designation
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Class Teacher Assignment
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Mobile / Username
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((t) => {
                  const assignedClass = t.classTeacherOf?.[0];
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {t.employeeCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {t.fullName}
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {t.designation || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {assignedClass
                          ? `Class ${assignedClass.class.name} (Section ${assignedClass.name})`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {t.user.phone}
                      </td>
                      <td className="px-4 py-3">
                        {t.user.isActive ? (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-100 font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-red-50 text-red-700 border border-red-100 font-medium flex items-center gap-1 w-max">
                            <ShieldAlert className="h-3 w-3" /> Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`teachers/${t.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
