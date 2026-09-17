import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  FileText,
  Users,
  CalendarCheck,
  BookOpen,
  Download,
  ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;

  const session = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  });

  const [totalStudents, totalTeachers] = await Promise.all([
    prisma.student.count({ where: { isActive: true } }),
    prisma.teacher.count(),
  ]);

  const reportCards = [
    {
      title: "Student List",
      description: "Export complete student list by class/section as Excel.",
      icon: Users,
      color: "#7c2d12",
      href: `/${locale}/admin/reports?export=students`,
    },
    {
      title: "Attendance Summary",
      description:
        "Daily, monthly, or session-wise attendance report for any class.",
      icon: CalendarCheck,
      color: "#15803d",
      href: `/${locale}/admin/reports?export=attendance`,
    },
    {
      title: "Marks / Results",
      description:
        "Exam-wise marks summary with totals, percentages, and ranks.",
      icon: BookOpen,
      color: "#1d4ed8",
      href: `/${locale}/admin/marks`,
    },
    {
      title: "Report Cards",
      description:
        "Generate and download student report cards as PDF for any session.",
      icon: FileText,
      color: "#7e22ce",
      href: `/${locale}/admin/reports?export=reportcards`,
    },
    {
      title: "Transfer Certificate / स्थानांतरण प्रमाण पत्र",
      description:
        "View all issued TCs. Search by class, student name, or admission number.",
      icon: ArrowRightLeft,
      color: "#b91c1c",
      href: `/${locale}/admin/reports/tc`,
    },
  ];

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Reports / रिपोर्ट
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate and export reports for session{" "}
          <span className="font-medium text-gray-700">
            {session?.label ?? "—"}
          </span>
          .
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            <p className="text-xs text-gray-500">Active Students</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalTeachers}</p>
            <p className="text-xs text-gray-500">Teachers</p>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.title}
              href={report.href}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${report.color}15` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: report.color }}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                    {report.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
                <Download className="h-4 w-4 text-gray-300 group-hover:text-gray-500 shrink-0 mt-0.5 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {!session && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          No academic session found. Set up a session from the Classes page
          before generating reports.
        </div>
      )}
    </main>
  );
}
