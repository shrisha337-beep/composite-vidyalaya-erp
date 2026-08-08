import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { User, BookOpen, CalendarCheck, CalendarDays, ClipboardList } from "lucide-react";

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["STUDENT", "PARENT"]);
  const { locale } = await params;

  // 1. Fetch student info, class, class teacher
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      section: {
        include: {
          class: { include: { session: true } },
          classTeacher: true,
        },
      },
    },
  });

  if (!student || !student.section) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Student profile configuration missing. Please register admission data.
        </div>
      </main>
    );
  }

  // 2. Fetch total active homework count
  const homeworkCount = await prisma.homework.count({
    where: {
      subject: { classId: student.section.classId },
      dueDate: { gte: new Date() },
    },
  });

  const activeSession = student.section.class.session.label;
  const teacherName = student.section.classTeacher?.fullName ?? "Not Assigned";

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl">
      {/* Welcome Banner */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          नमस्ते, {student.fullName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome to your school dashboard. Academic Session: <span className="font-semibold text-gray-700">{activeSession}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Class level info */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">My Current Class</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            Class {student.section.class.name} (Section {student.section.name})
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">Class Teacher: {teacherName}</p>
        </div>

        {/* Homework counter */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Homework</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {homeworkCount} tasks
          </p>
          <Link
            href={`/${locale}/student/homework`}
            className="text-[10px] font-semibold text-blue-600 hover:underline inline-block mt-1.5"
          >
            View tasks →
          </Link>
        </div>

        {/* SR Number (Admission number) */}
        <div className="bg-white p-5 border border-gray-200 rounded-lg">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admission Number (SR No)</p>
          <p className="text-lg font-bold text-gray-900 mt-1 font-mono">
            {student.admissionNo}
          </p>
          <p className="text-[10px] text-gray-400 mt-1.5">UDISE Code: {student.udiseCode ?? "—"}</p>
        </div>
      </div>

      {/* Grid Links to Pages */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Navigation</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Profile */}
        <Link
          href={`/${locale}/student/profile`}
          className="bg-white p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center gap-4 group"
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-md group-hover:bg-blue-100 transition-colors">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">My Profile</h3>
            <p className="text-xs text-gray-400 mt-0.5">View registered data</p>
          </div>
        </Link>

        {/* Homework */}
        <Link
          href={`/${locale}/student/homework`}
          className="bg-white p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center gap-4 group"
        >
          <div className="p-3 bg-green-50 text-green-600 rounded-md group-hover:bg-green-100 transition-colors">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Daily Homework</h3>
            <p className="text-xs text-gray-400 mt-0.5">Assigned work tasks</p>
          </div>
        </Link>

        {/* Timetable */}
        <Link
          href={`/${locale}/student/timetable`}
          className="bg-white p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center gap-4 group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-md group-hover:bg-indigo-100 transition-colors">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Class Timetable</h3>
            <p className="text-xs text-gray-400 mt-0.5">Daily period timeline</p>
          </div>
        </Link>

        {/* Attendance */}
        <Link
          href={`/${locale}/student/attendance`}
          className="bg-white p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center gap-4 group"
        >
          <div className="p-3 bg-orange-50 text-orange-600 rounded-md group-hover:bg-orange-100 transition-colors">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Attendance Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">Monthly presence checks</p>
          </div>
        </Link>

        {/* Report Card */}
        <Link
          href={`/${locale}/student/marks`}
          className="bg-white p-5 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors flex items-center gap-4 group"
        >
          <div className="p-3 bg-red-50 text-red-600 rounded-md group-hover:bg-red-100 transition-colors">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Report Card</h3>
            <p className="text-xs text-gray-400 mt-0.5">Exam term results</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
