import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSchoolSettings } from "@/lib/data/school-settings";
import { MdmDashboardView, type ClassSectionMDM, type MonthlyDayLog } from "@/components/admin/mdm-dashboard-view";

import {
  DEFAULT_MDM_RATES,
  calculateTierMDM,
  calculateMDMDayTotal,
  calculateStockLedger,
  isPrimaryClass,
  type MDMRates,
  type MDMItemsServed,
} from "@/lib/mdm-engine";

function isPrimary(className: string) {
  return isPrimaryClass(className);
}

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

  // Load admin-configured MDM costs and menu options
  const settings = await getSchoolSettings();
  const CONVERSION_COST_PRIMARY = settings.conversionCostPrimary;
  const CONVERSION_COST_JUNIOR = settings.conversionCostJunior;
  const FRUIT_COST = settings.fruitCostPerStudent;
  const NUTRITION_COST = settings.nutritionCostPerStudent;

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

  // 6. Fetch MDM daily item selection for the selected date
  const todayItemSelection = await prisma.mDMDailyItemSelection.findUnique({
    where: { date: selectedDateObj },
  });

  // Build fruit attendance lookup: studentId -> boolean
  const fruitAttendanceMap = new Map<string, boolean>();
  if (mdmLog && mdmLog.studentAttendance.length > 0) {
    mdmLog.studentAttendance.forEach((sa) => {
      fruitAttendanceMap.set(sa.studentId, sa.didEat);
    });
  }

  // 7. Build classSection data structure
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

  // 8. Generate monthly log data — split by primary / junior
  const [yearStr, monthNumStr] = selectedMonthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10); // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Query month's present attendance grouped by day AND student
  const monthAttendanceRaw = await prisma.attendance.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      status: "PRESENT",
    },
    select: {
      date: true,
      studentId: true,
      student: {
        select: {
          section: {
            select: {
              class: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  // Build per-day, per-level attendance counts
  const monthAttendanceByLevel = new Map<string, { primary: number; junior: number }>();
  monthAttendanceRaw.forEach((rec) => {
    const dStr = new Date(rec.date).toISOString().split("T")[0];
    if (!monthAttendanceByLevel.has(dStr)) {
      monthAttendanceByLevel.set(dStr, { primary: 0, junior: 0 });
    }
    const entry = monthAttendanceByLevel.get(dStr)!;
    const className = rec.student?.section?.class?.name;
    if (className && isPrimary(className)) {
      entry.primary += 1;
    } else {
      entry.junior += 1;
    }
  });

  // Query month's MDM logs for fruit data
  const monthMdmLogs = await prisma.mDMDailyLog.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      mealType: "LUNCH",
    },
    include: {
      studentAttendance: {
        include: {
          student: {
            select: {
              section: {
                select: {
                  class: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Map<dateStr, { primaryFruit: number, juniorFruit: number }>
  const monthFruitByLevel = new Map<string, { primary: number; junior: number }>();
  monthMdmLogs.forEach((log) => {
    const dStr = new Date(log.date).toISOString().split("T")[0];
    if (!monthFruitByLevel.has(dStr)) {
      monthFruitByLevel.set(dStr, { primary: 0, junior: 0 });
    }
    const entry = monthFruitByLevel.get(dStr)!;
    log.studentAttendance.forEach((sa) => {
      if (sa.didEat) {
        const className = sa.student?.section?.class?.name;
        if (className && isPrimary(className)) {
          entry.primary += 1;
        } else {
          entry.junior += 1;
        }
      }
    });
  });

  // Query all daily item selections for this month
  const monthItemSelections = await prisma.mDMDailyItemSelection.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
    },
  });
  const itemSelectionByDate = new Map<
    string,
    {
      rice: boolean;
      wheat: boolean;
      fruits: boolean;
      nutrition: boolean;
      milk: boolean;
      riceMenu: string | null;
      wheatMenu: string | null;
    }
  >();
  monthItemSelections.forEach((sel) => {
    const dStr = new Date(sel.date).toISOString().split("T")[0];
    itemSelectionByDate.set(dStr, {
      rice: sel.rice,
      wheat: sel.wheat,
      fruits: sel.fruits,
      nutrition: sel.nutrition,
      milk: sel.milk,
      riceMenu: sel.riceMenu,
      wheatMenu: sel.wheatMenu,
    });
  });

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const primaryMonthlyLogs: MonthlyDayLog[] = [];
  const juniorMonthlyLogs: MonthlyDayLog[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dayStr = `${yearStr}-${monthNumStr.padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayOfWeek = dayNames[dayDate.getDay()];

    const levelCounts = monthAttendanceByLevel.get(dayStr) ?? { primary: 0, junior: 0 };
    const fruitCounts = monthFruitByLevel.get(dayStr);
    const dayItems = itemSelectionByDate.get(dayStr);

    const rates: MDMRates = {
      grainPrimaryGrams: DEFAULT_MDM_RATES.grainPrimaryGrams,
      grainJuniorGrams: DEFAULT_MDM_RATES.grainJuniorGrams,
      conversionCostPrimary: settings.conversionCostPrimary,
      conversionCostJunior: settings.conversionCostJunior,
      fruitCostPerStudent: settings.fruitCostPerStudent,
      nutritionCostPerStudent: settings.nutritionCostPerStudent,
      milkMlPrimary: DEFAULT_MDM_RATES.milkMlPrimary,
      milkMlJunior: DEFAULT_MDM_RATES.milkMlJunior,
    };

    const items: MDMItemsServed = {
      rice: !!dayItems?.rice,
      wheat: !!dayItems?.wheat,
      fruits: !!dayItems?.fruits,
      nutrition: !!dayItems?.nutrition,
      milk: !!dayItems?.milk,
    };

    // Primary & Junior tiers calculated via pure engine calculateMDMDayTotal
    const dayTotal = calculateMDMDayTotal(
      { presentStudents: levelCounts.primary, fruitsEaten: fruitCounts?.primary },
      { presentStudents: levelCounts.junior, fruitsEaten: fruitCounts?.junior },
      items,
      rates
    );
    const primaryCalc = dayTotal.primary;
    const juniorCalc = dayTotal.junior;

    primaryMonthlyLogs.push({
      dateStr: dayStr,
      dayOfWeek,
      totalPresent: primaryCalc.present,
      wheatGrams: primaryCalc.wheatGrams,
      riceGrams: primaryCalc.riceGrams,
      fruitsEaten: primaryCalc.fruitsEaten,
      fruitCost: primaryCalc.fruitCost,
      conversionCost: primaryCalc.conversionCost,
      nutritionCost: primaryCalc.nutritionCost,
      milkStudents: primaryCalc.milkStudents,
      milkLitres: primaryCalc.milkLitres,
      riceMenu: dayItems?.riceMenu || null,
      wheatMenu: dayItems?.wheatMenu || null,
      itemsServed: dayItems || null,
      hasAttendance: primaryCalc.present > 0,
    });

    juniorMonthlyLogs.push({
      dateStr: dayStr,
      dayOfWeek,
      totalPresent: juniorCalc.present,
      wheatGrams: juniorCalc.wheatGrams,
      riceGrams: juniorCalc.riceGrams,
      fruitsEaten: juniorCalc.fruitsEaten,
      fruitCost: juniorCalc.fruitCost,
      conversionCost: juniorCalc.conversionCost,
      nutritionCost: juniorCalc.nutritionCost,
      milkStudents: juniorCalc.milkStudents,
      milkLitres: juniorCalc.milkLitres,
      riceMenu: dayItems?.riceMenu || null,
      wheatMenu: dayItems?.wheatMenu || null,
      itemsServed: dayItems || null,
      hasAttendance: juniorCalc.present > 0,
    });
  }

  // Monthly food grain stock ledger reconciliation via pure engine
  const monthlyWheatConsumedKg = Math.round(
    (primaryMonthlyLogs.reduce((s, l) => s + l.wheatGrams, 0) +
     juniorMonthlyLogs.reduce((s, l) => s + l.wheatGrams, 0)) / 10
  ) / 100;
  const monthlyRiceConsumedKg = Math.round(
    (primaryMonthlyLogs.reduce((s, l) => s + l.riceGrams, 0) +
     juniorMonthlyLogs.reduce((s, l) => s + l.riceGrams, 0)) / 10
  ) / 100;

  const wheatStockLedger = calculateStockLedger(0, monthlyWheatConsumedKg, monthlyWheatConsumedKg);
  const riceStockLedger = calculateStockLedger(0, monthlyRiceConsumedKg, monthlyRiceConsumedKg);

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <MdmDashboardView
        selectedDateStr={selectedDateStr}
        selectedMonthStr={selectedMonthStr}
        locale={locale}
        classesData={classesData}
        primaryMonthlyLogs={primaryMonthlyLogs}
        juniorMonthlyLogs={juniorMonthlyLogs}
        conversionCostPrimary={CONVERSION_COST_PRIMARY}
        conversionCostJunior={CONVERSION_COST_JUNIOR}
        fruitCostPerStudent={FRUIT_COST}
        nutritionCostPerStudent={NUTRITION_COST}
        riceMenuOptions={settings.riceMenuOptions}
        wheatMenuOptions={settings.wheatMenuOptions}
        todayItemSelection={todayItemSelection ? {
          rice: todayItemSelection.rice,
          wheat: todayItemSelection.wheat,
          fruits: todayItemSelection.fruits,
          nutrition: todayItemSelection.nutrition,
          milk: todayItemSelection.milk,
          riceMenu: todayItemSelection.riceMenu,
          wheatMenu: todayItemSelection.wheatMenu,
        } : null}
      />
    </main>
  );
}
