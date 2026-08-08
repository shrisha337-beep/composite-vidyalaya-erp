import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { Users, Upload, Plus, Search, ArrowUpCircle } from "lucide-react";

const PAGE_SIZE = 25;

async function getStudents(q: string, classFilter: string, page: number) {
  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  const where = {
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { admissionNo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(classFilter && session
      ? {
          section: {
            class: {
              name: classFilter,
              sessionId: session.id,
            },
          },
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        section: { include: { class: true } },
        guardians: { where: { relation: "FATHER" }, take: 1 },
      },
      orderBy: [
        { section: { class: { name: "asc" } } },
        { fullName: "asc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.student.count({ where }),
  ]);

  return { students, total, pages: Math.ceil(total / PAGE_SIZE) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; class?: string; page?: string }>;
}) {
  await requireRole(["ADMIN"]);

  const params = await searchParams;
  const q = params.q ?? "";
  const classFilter = params.class ?? "";
  const page = Number(params.page ?? 1);

  // Check if session exists
  const hasSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });

  const { students, total, pages } = await getStudents(q, classFilter, page);

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-6xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} student{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSession && (
            <>
              <Link
                href="students/promote"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Promote Students
              </Link>
              <Link
                href="students/import"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Bulk Import
              </Link>
              <Link
                href="students/new"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{ background: "hsl(var(--primary))" }}
              >
                <Plus className="h-4 w-4" />
                Add Student
              </Link>
            </>
          )}
        </div>
      </div>

      {/* No session warning */}
      {!hasSession && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
          <strong>Setup required:</strong> Please{" "}
          <Link href="classes" className="underline font-medium">
            set up the academic session
          </Link>{" "}
          before adding students.
        </div>
      )}

      {/* Search + filter */}
      <form method="GET" className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <select
          name="class"
          defaultValue={classFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          <option value="">All classes</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={String(n)}>
              Class {n}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
        {(q || classFilter) && (
          <Link
            href="students"
            className="px-4 py-2 rounded-md text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      {students.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600 mb-1">
            {q || classFilter ? "No students found" : "No students yet"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {q || classFilter
              ? "Try a different search or clear the filters."
              : "Use Bulk Import to add existing students or Add Student for a new admission."}
          </p>
          {!q && !classFilter && hasSession && (
            <Link
              href="students/import"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Admission No
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Class
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Gender
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Father&apos;s Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Mobile
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {s.admissionNo}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {s.fullName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.section ? `Class ${s.section.class.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {s.gender.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.guardians[0]?.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.mobileNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`students/${s.id}`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`?q=${q}&class=${classFilter}&page=${page - 1}`}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={`?q=${q}&class=${classFilter}&page=${page + 1}`}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
