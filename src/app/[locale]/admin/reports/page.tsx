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
      color: "#3D5A80",
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
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[#2D2A26]">
          Reports / रिपोर्ट
        </h1>
        <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
          Generate and export institutional records for session{" "}
          <span className="font-semibold text-[#2D2A26]">
            {session?.label ?? "-"}
          </span>
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 flex items-center gap-3 shadow-xs">
          <Users className="h-5 w-5 text-[#6B1D30]" />
          <div>
            <p className="text-xl sm:text-2xl font-bold text-[#2D2A26]">{totalStudents}</p>
            <p className="text-xs text-[#7A7267]">Active Students</p>
          </div>
        </div>
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 flex items-center gap-3 shadow-xs">
          <Users className="h-5 w-5 text-[#3D5A80]" />
          <div>
            <p className="text-xl sm:text-2xl font-bold text-[#2D2A26]">{totalTeachers}</p>
            <p className="text-xs text-[#7A7267]">Staff Members</p>
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
              className="bg-white border border-[#E8E0D4] rounded-sm p-4 sm:p-5 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 shadow-xs transition-all group"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
                  style={{ background: `${report.color}15` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: report.color }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-[#2D2A26] group-hover:text-[#6B1D30] transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
                    {report.description}
                  </p>
                </div>
                <Download className="h-4 w-4 text-[#A89F91] group-hover:text-[#6B1D30] shrink-0 mt-0.5 transition-colors" />
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
