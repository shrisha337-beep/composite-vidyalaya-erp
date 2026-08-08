import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, Award } from "lucide-react";

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  // 1. Fetch student info
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true, section: { select: { class: { select: { sessionId: true } } } } },
  });

  if (!student || !student.section) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          No class section assignment found.
        </div>
      </main>
    );
  }

  const activeSessionId = student.section.class.sessionId;

  // 2. Fetch all attendance logs for this student in the active session
  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: student.id,
      sessionId: activeSessionId,
    },
    orderBy: { date: "desc" },
  });

  const totalDays = attendances.length;
  const presentDays = attendances.filter((a) => a.status === "PRESENT").length;
  const absentDays = attendances.filter((a) => a.status === "ABSENT").length;
  const pct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/student/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            मेरी दैनिक उपस्थिति
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">My Attendance Log & Statistics</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Attendance Rate</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{pct}%</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total School Days</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{totalDays} days</p>
        </div>

        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Days Present</p>
          <p className="text-lg font-bold text-green-700 mt-1">{presentDays} days</p>
        </div>

        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Days Absent</p>
          <p className="text-lg font-bold text-red-700 mt-1">{absentDays} days</p>
        </div>
      </div>

      {/* Daily Records list */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4">
          Daily Attendance Logs / दैनिक रिकॉर्ड
        </h3>

        {attendances.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded">
            No attendance marked in the database yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-44">Date / दिनांक</th>
                  <th className="py-2.5 px-4">Status / स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendances.map((att) => {
                  const isPresent = att.status === "PRESENT";
                  return (
                    <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-gray-700">
                        {new Date(att.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={[
                            "px-2.5 py-0.5 rounded-full font-bold text-[10px]",
                            isPresent
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : "bg-red-50 text-red-700 border border-red-100",
                          ].join(" ")}
                        >
                          {isPresent ? "Present / उपस्थित" : "Absent / अनुपस्थित"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
