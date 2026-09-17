import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  FileText,
  Download,
  Filter,
} from "lucide-react";

export default async function TcReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ class?: string; search?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const query = await searchParams;

  const classFilter = query.class ?? "";
  const searchQuery = query.search ?? "";

  // Fetch active session for class list
  const activeSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  });

  // Fetch all class names for filter dropdown
  const allClasses = activeSession
    ? await prisma.class.findMany({
        where: { sessionId: activeSession.id },
        select: { name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Build TC query with filters
  const whereClause: Record<string, unknown> = {};

  // Search filter — match student name or admission number
  if (searchQuery) {
    whereClause.OR = [
      { studentNameSnapshot: { contains: searchQuery, mode: "insensitive" } },
      { student: { admissionNo: { contains: searchQuery, mode: "insensitive" } } },
      { tcNumber: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  // Class filter
  if (classFilter) {
    whereClause.lastClassStudied = {
      contains: classFilter,
      mode: "insensitive",
    };
  }

  // Fetch TCs
  const transferCertificates = await prisma.transferCertificate.findMany({
    where: whereClause,
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          section: {
            select: {
              class: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalTcs = transferCertificates.length;

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/admin/reports`}
          className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Transfer Certificates / स्थानांतरण प्रमाण पत्र
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalTcs} TC{totalTcs !== 1 ? "s" : ""} issued
            {activeSession ? ` · Session: ${activeSession.label}` : ""}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-xs">
        <form
          method="GET"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search student name, admission no, or TC no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1D30] focus:border-transparent"
            />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              name="class"
              defaultValue={classFilter}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6B1D30] appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">All Classes / सभी कक्षाएं</option>
              {allClasses.map((cls) => (
                <option key={cls.name} value={cls.name}>
                  Class {cls.name} / कक्षा {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "hsl(var(--primary))" }}
          >
            Search / खोजें
          </button>

          {/* Reset */}
          {(searchQuery || classFilter) && (
            <Link
              href={`/${locale}/admin/reports/tc`}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 text-center"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* TC Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Student / छात्र</th>
                <th className="px-5 py-3">Admission No</th>
                <th className="px-5 py-3">Class / कक्षा</th>
                <th className="px-5 py-3">TC No</th>
                <th className="px-5 py-3">Date of Issue</th>
                <th className="px-5 py-3">Reason / कारण</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transferCertificates.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-16 text-center text-sm text-gray-400"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-500">No transfer certificates found</p>
                    <p className="text-xs mt-1">
                      {searchQuery || classFilter
                        ? "Try adjusting your search or filter."
                        : "No TCs have been issued yet."}
                    </p>
                  </td>
                </tr>
              ) : (
                transferCertificates.map((tc, idx) => {
                  const dateOfIssue = new Date(tc.dateOfIssue).toLocaleDateString(
                    "en-IN",
                    { day: "2-digit", month: "short", year: "numeric" }
                  );

                  return (
                    <tr
                      key={tc.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs font-mono text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-800">
                          {tc.studentNameSnapshot}
                        </p>
                        {tc.fatherNameSnapshot && (
                          <p className="text-xs text-gray-500">
                            S/D of {tc.fatherNameSnapshot}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                        {tc.student?.admissionNo ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {tc.lastClassStudied}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {tc.tcNumber}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">
                        {dateOfIssue}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[200px] truncate">
                        {tc.reasonForLeaving}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            tc.status === "ISSUED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {tc.student && (
                          <Link
                            href={`/${locale}/admin/students/${tc.student.id}/tc/download`}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <Download className="h-3 w-3" /> Download
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {totalTcs > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {totalTcs} transfer certificate{totalTcs !== 1 ? "s" : ""}
            {classFilter ? ` for Class ${classFilter}` : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </div>
        )}
      </div>
    </main>
  );
}
