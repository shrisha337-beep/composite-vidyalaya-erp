import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { MdmDashboardView, type ClassSectionMDM, type MonthlyDayLog } from "@/components/admin/mdm-dashboard-view";

export default async function AdminMDMPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; month?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { locale } = await params;
  const query = await searchParams;

  const now = new Date();
  const defaultDateStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const defaultMonthStr = defaultDateStr.substring(0, 7); // "YYYY-MM"

  const selectedDateStr = query.date && !isNaN(Date.parse(query.date)) ? query.date : defaultDateStr;
  const selectedMonthStr = query.month && query.month.length === 7 ? query.month : defaultMonthStr;

  // 1. Fetch active session
  const activeSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true, label: true },
  });

  // 2. Date ranges for selected date
  const selectedDateObj = new Date(selectedDateStr);
  selectedDateObj.setHours(0, 0, 0, 0);
  const nextDateObj = new Date(selectedDateObj);
  nextDateObj.setDate(nextDateObj.getDate() + 1);

  // 3. Fetch all classes, sections, and enrolled students for this session
  const classes = activeSession
    ? await prisma.class.findMany({
        where: { sessionId: activeSession.id },
        orderBy: { name: "asc" },
        include: {
          sections: {
            orderBy: { name: "asc" },
            include: {
              students: {
                select: {
                  id: true,
                  fullName: true,
                  admissionNo: true,
                  gender: true,
                },
                orderBy: { fullName: "asc" },
              },
            },
          },
        },
      })
    : [];

  // 4. Fetch attendance records for the selected date where status = PRESENT
  const presentAttendance = await prisma.attendance.findMany({
    where: {
      date: { gte: selectedDateObj, lt: nextDateObj },
      status: "PRESENT",
    },
    select: {
      studentId: true,
    },
  });
  const presentStudentIds = new Set(presentAttendance.map((a) => a.studentId));

  // 5. Fetch MDM Daily Log and student fruit attendance for this date
  const mdmLog = await prisma.mDMDailyLog.findUnique({
    where: {
      date_mealType: {
        date: selectedDateObj,
        mealType: "LUNCH",
      },
    },
    include: {
      studentAttendance: true,
    },
  });

  // Build fruit attendance lookup: studentId -> boolean
  const fruitAttendanceMap = new Map<string, boolean>();
  if (mdmLog && mdmLog.studentAttendance.length > 0) {
    mdmLog.studentAttendance.forEach((sa) => {
      fruitAttendanceMap.set(sa.studentId, sa.didEat);
    });
  }

  // 6. Build classSection data structure
  const classesData: ClassSectionMDM[] = [];

  classes.forEach((cls) => {
    cls.sections.forEach((sec) => {
      const presentStudents = sec.students
        .filter((s) => presentStudentIds.has(s.id))
        .map((s) => ({
          id: s.id,
          fullName: s.fullName,
          admissionNo: s.admissionNo,
          gender: s.gender,
          // Default to true (ate fruit) if not explicitly set to false
          didEatFruit: fruitAttendanceMap.has(s.id)
            ? (fruitAttendanceMap.get(s.id) ?? true)
            : true,
        }));

      classesData.push({
        classId: cls.id,
        className: cls.name,
        sectionId: sec.id,
        sectionName: sec.name,
        totalStudents: sec.students.length,
        presentStudents,
      });
    });
  });

  // 7. Generate monthly log data
  const [yearStr, monthNumStr] = selectedMonthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10); // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Query month's present attendance grouped by day
  const monthAttendance = await prisma.attendance.groupBy({
    by: ["date"],
    where: {
      date: { gte: monthStart, lt: monthEnd },
      status: "PRESENT",
    },
    _count: { studentId: true },
  });

  const monthAttendanceMap = new Map<string, number>();
  monthAttendance.forEach((rec) => {
    const dStr = new Date(rec.date).toISOString().split("T")[0];
    monthAttendanceMap.set(dStr, rec._count.studentId);
  });

  // Query month's MDM logs
  const monthMdmLogs = await prisma.mDMDailyLog.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      mealType: "LUNCH",
    },
    include: {
      studentAttendance: true,
    },
  });

  const monthFruitEatenMap = new Map<string, number>();
  monthMdmLogs.forEach((log) => {
    const dStr = new Date(log.date).toISOString().split("T")[0];
    const eaten = log.studentAttendance.filter((s) => s.didEat).length;
    monthFruitEatenMap.set(dStr, eaten);
  });

  const monthlyLogs: MonthlyDayLog[] = [];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dayStr = `${yearStr}-${monthNumStr.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = dayNames[dayDate.getDay()];
    const presentCount = monthAttendanceMap.get(dayStr) ?? 0;

    // If MDM student records exist, use that; otherwise if attendance was marked, default to presentCount
    const fruitsEaten = monthFruitEatenMap.has(dayStr)
      ? (monthFruitEatenMap.get(dayStr) ?? 0)
      : presentCount;

    const wheatGrams = presentCount * 100;
    const riceGrams = presentCount * 100;
    const fruitCost = fruitsEaten * 4;

    monthlyLogs.push({
      dateStr: dayStr,
      dayOfWeek,
      totalPresent: presentCount,
      wheatGrams,
      riceGrams,
      fruitsEaten,
      fruitCost,
      hasAttendance: presentCount > 0,
    });
  }

  return (
    <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full">
      <MdmDashboardView
        selectedDateStr={selectedDateStr}
        selectedMonthStr={selectedMonthStr}
        locale={locale}
        classesData={classesData}
        monthlyLogs={monthlyLogs}
      />
    </main>
  );
}
