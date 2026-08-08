import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

const DAYS_OF_WEEK = [
  { val: 1, label: "Monday / सोमवार" },
  { val: 2, label: "Tuesday / मंगलवार" },
  { val: 3, label: "Wednesday / बुधवार" },
  { val: 4, label: "Thursday / गुरुवार" },
  { val: 5, label: "Friday / शुक्रवार" },
  { val: 6, label: "Saturday / शनिवार" },
];

export default async function TeacherTimetablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await requireRole(["TEACHER"]);
  const { locale } = await params;

  // 1. Fetch teacher record
  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true, fullName: true },
  });

  if (!teacher) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Teacher profile not found.
        </div>
      </main>
    );
  }

  // 2. Fetch timetable slots
  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId: teacher.id },
    include: {
      subject: { select: { name: true } },
      section: {
        include: { class: true },
      },
    },
    orderBy: [
      { dayOfWeek: "asc" },
      { startTime: "asc" },
    ],
  });

  // Group slots by day
  const slotsByDay: Record<number, typeof slots> = {};
  DAYS_OF_WEEK.forEach((d) => {
    slotsByDay[d.val] = slots.filter((s) => s.dayOfWeek === d.val);
  });

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/${locale}/teacher/dashboard`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            मेरी समय सारणी
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">My Teaching Schedule & Periods</p>
        </div>
      </div>

      {/* Weekday cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DAYS_OF_WEEK.map((d) => {
          const daySlots = slotsByDay[d.val] || [];
          return (
            <div key={d.val} className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-2 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {d.label}
              </h2>

              {daySlots.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No lectures scheduled today.</p>
              ) : (
                <div className="space-y-3">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100 text-xs hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <div>
                          <p className="font-bold text-gray-700">
                            {slot.startTime} - {slot.endTime}
                          </p>
                          <p className="text-gray-400 mt-0.5">Time Interval</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-700">{slot.subject.name}</p>
                        <p className="text-gray-500 mt-0.5">Class {slot.section.class.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
