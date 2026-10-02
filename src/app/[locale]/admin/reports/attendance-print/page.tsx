import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import {
  PrintableAttendanceReport,
  SectionAttendanceData,
  SchoolInfo,
} from "@/components/admin/printable-attendance-report";
import { getSchoolSettings } from "@/app/actions/school-settings";

export default async function AttendancePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; mode?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const sp = await searchParams;

  const todayStr = new Date().toISOString().split("T")[0];
  const dateParam = sp.date ?? todayStr;
  const mode = (sp.mode === "weekly" || sp.mode === "monthly" ? sp.mode : "daily") as
    | "daily"
    | "weekly"
    | "monthly";

  // Parse date without timezone offset issues
  const [y, m, d] = dateParam.split("-").map(Number);
  const selectedYear = isNaN(y) ? new Date().getFullYear() : y;
  const selectedMonth = isNaN(m) ? new Date().getMonth() + 1 : m;
  const selectedDay = isNaN(d) ? new Date().getDate() : d;

  const selectedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);

  // Active session
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  });

  if (!currentSession) {
    return (
      <main className="flex-1 p-6 lg:p-8 max-w-5xl">
        <h1 className="text-xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-sm text-gray-500 mt-2">No active academic session found.</p>
      </main>
    );
  }

  // School settings
  const settings = await getSchoolSettings();
  const schoolInfo: SchoolInfo = {
    schoolName: settings.schoolName || "Composite School Chandpur Tarhar",
    address: settings.address || "",
    udiseCode: settings.udiseCode || "09530607202",
    schoolBlock: settings.schoolBlock || "Paraspur",
    schoolDistrict: settings.schoolDistrict || "Gonda",
  };

  // Determine date bounds & label
  let dateStart: Date;
  let dateEnd: Date;
  let dateRangeLabel = "";

  if (mode === "weekly") {
    const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    dateStart = new Date(selectedYear, selectedMonth - 1, selectedDay + mondayOffset, 0, 0, 0, 0);
    dateEnd = new Date(selectedYear, selectedMonth - 1, selectedDay + mondayOffset + 5, 23, 59, 59, 999);

    const startStr = dateStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const endStr = dateEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const startStrHi = dateStart.toLocaleDateString("hi-IN", { day: "2-digit", month: "long" });
    const endStrHi = dateEnd.toLocaleDateString("hi-IN", { day: "2-digit", month: "long", year: "numeric" });
    dateRangeLabel = `${startStr} – ${endStr} (${startStrHi} से ${endStrHi})`;
  } else if (mode === "monthly") {
    dateStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
    dateEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);

    const monthNameEn = selectedDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const monthNameHi = selectedDate.toLocaleDateString("hi-IN", { month: "long", year: "numeric" });
    dateRangeLabel = `${monthNameEn} / ${monthNameHi}`;
  } else {
    // Daily
    dateStart = new Date(selectedYear, selectedMonth - 1, selectedDay, 0, 0, 0, 0);
    dateEnd = new Date(selectedYear, selectedMonth - 1, selectedDay, 23, 59, 59, 999);

    const dayEn = selectedDate.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const dayHi = selectedDate.toLocaleDateString("hi-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    dateRangeLabel = `${dayEn} (${dayHi})`;
  }

  // Fetch all classes & active students
  const classes = await prisma.class.findMany({
    where: { sessionId: currentSession.id },
    orderBy: { name: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
        include: {
          students: {
            where: { isActive: true },
            select: {
              id: true,
              gender: true,
            },
          },
        },
      },
    },
  });

  // Map student ID to section and gender
  const studentMap = new Map<string, { sectionId: string; gender: string }>();
  for (const c of classes) {
    for (const sec of c.sections) {
      for (const st of sec.students) {
        studentMap.set(st.id, { sectionId: sec.id, gender: st.gender });
      }
    }
  }

  // Fetch attendance records in ONE batch query
  const attendanceLogs = await prisma.attendance.findMany({
    where: {
      sessionId: currentSession.id,
      date: mode === "daily" ? selectedDate : { gte: dateStart, lte: dateEnd },
    },
    select: {
      studentId: true,
      date: true,
      status: true,
    },
  });

  // Aggregate in memory
  const distinctSchoolDates = new Set<string>();
  const sectionStatsMap = new Map<
    string,
    { boysPresent: number; girlsPresent: number; datesMarked: Set<string> }
  >();

  for (const log of attendanceLogs) {
    const student = studentMap.get(log.studentId);
    if (!student) continue;

    const dateKey = log.date.toISOString().split("T")[0];
    distinctSchoolDates.add(dateKey);

    let secStats = sectionStatsMap.get(student.sectionId);
    if (!secStats) {
      secStats = { boysPresent: 0, girlsPresent: 0, datesMarked: new Set() };
      sectionStatsMap.set(student.sectionId, secStats);
    }
    secStats.datesMarked.add(dateKey);

    if (log.status === "PRESENT") {
      if (student.gender === "MALE") {
        secStats.boysPresent++;
      } else if (student.gender === "FEMALE") {
        secStats.girlsPresent++;
      }
    }
  }

  const schoolWorkingDays =
    mode === "daily"
      ? distinctSchoolDates.size > 0
        ? 1
        : 0
      : distinctSchoolDates.size;

  // Build section rows
  const sections: SectionAttendanceData[] = [];

  for (const cls of classes) {
    for (const sec of cls.sections) {
      const boys = sec.students.filter((s) => s.gender === "MALE");
      const girls = sec.students.filter((s) => s.gender === "FEMALE");
      const totalBoys = boys.length;
      const totalGirls = girls.length;
      const totalStudents = sec.students.length;

      const stats = sectionStatsMap.get(sec.id) || {
        boysPresent: 0,
        girlsPresent: 0,
        datesMarked: new Set<string>(),
      };

      const sectionWorkingDays =
        mode === "daily"
          ? stats.datesMarked.size > 0
            ? 1
            : 0
          : schoolWorkingDays;

      const boysPresent = stats.boysPresent;
      const girlsPresent = stats.girlsPresent;
      const totalPresent = boysPresent + girlsPresent;

      const possibleBoys =
        mode === "daily"
          ? totalBoys
          : totalBoys * Math.max(1, sectionWorkingDays);
      const possibleGirls =
        mode === "daily"
          ? totalGirls
          : totalGirls * Math.max(1, sectionWorkingDays);
      const possibleTotal =
        mode === "daily"
          ? totalStudents
          : totalStudents * Math.max(1, sectionWorkingDays);

      const boysPct =
        possibleBoys > 0 ? Math.round((boysPresent / possibleBoys) * 100) : 0;
      const girlsPct =
        possibleGirls > 0 ? Math.round((girlsPresent / possibleGirls) * 100) : 0;
      const totalPct =
        possibleTotal > 0 ? Math.round((totalPresent / possibleTotal) * 100) : 0;

      const boysAvg =
        sectionWorkingDays > 0
          ? (boysPresent / sectionWorkingDays).toFixed(1)
          : "0";
      const girlsAvg =
        sectionWorkingDays > 0
          ? (girlsPresent / sectionWorkingDays).toFixed(1)
          : "0";
      const totalAvg =
        sectionWorkingDays > 0
          ? (totalPresent / sectionWorkingDays).toFixed(1)
          : "0";

      sections.push({
        className: cls.name,
        sectionName: sec.name,
        totalBoys,
        totalGirls,
        totalStudents,
        workingDays: sectionWorkingDays,
        boysPresent,
        girlsPresent,
        totalPresent,
        boysAvg,
        girlsAvg,
        totalAvg,
        boysPct,
        girlsPct,
        totalPct,
      });
    }
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/${locale}/admin/reports`}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Back to Reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#2D2A26] flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-[#6B1D30]" />
            <span>छात्र-छात्रा उपस्थिति रिपोर्ट / Printable Attendance Register</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#7A7267] mt-0.5">
            Primary (1–5) and Junior (6–8) sections · Gender-wise (बालक / बालिका) attendance records
          </p>
        </div>
      </div>

      <PrintableAttendanceReport
        sections={sections}
        selectedDate={dateParam}
        mode={mode}
        dateRangeLabel={dateRangeLabel}
        workingDays={schoolWorkingDays}
        schoolInfo={schoolInfo}
      />
    </main>
  );
}
