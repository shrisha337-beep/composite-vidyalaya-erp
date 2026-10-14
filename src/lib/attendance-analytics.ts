import { prisma } from "@/lib/prisma";
import type {
  StudentAttendanceData,
  ClassSummaryData,
} from "@/components/admin/attendance-analytics";

export interface AnalyticsStudent {
  id: string;
  fullName: string;
  admissionNo: string;
  gender: string;
}

export interface AnalyticsSection {
  className: string;
  sectionName: string;
  students: AnalyticsStudent[];
}

export interface PeriodAnalytics {
  sessionStudentData: StudentAttendanceData[];
  sessionClassSummary: ClassSummaryData[];
  monthlyStudentData: StudentAttendanceData[];
  monthlyClassSummary: ClassSummaryData[];
}

type Counts = { total: number; present: number };

/** Sum groupBy(studentId, status) rows into per-student { total, present }. */
function toCountMap(
  rows: { studentId: string; status: string; _count: { _all: number } }[]
): Map<string, Counts> {
  const map = new Map<string, Counts>();
  for (const r of rows) {
    const c = map.get(r.studentId) ?? { total: 0, present: 0 };
    c.total += r._count._all;
    if (r.status === "PRESENT") c.present += r._count._all;
    map.set(r.studentId, c);
  }
  return map;
}

function summarise(
  sec: AnalyticsSection,
  daysMarked: number,
  counts: Map<string, Counts> | null
): ClassSummaryData {
  let boysCount = 0, girlsCount = 0, totalPresent = 0, boysPresent = 0, girlsPresent = 0;
  for (const s of sec.students) {
    const present = counts?.get(s.id)?.present ?? 0;
    totalPresent += present;
    if (s.gender === "MALE") { boysCount++; boysPresent += present; }
    if (s.gender === "FEMALE") { girlsCount++; girlsPresent += present; }
  }
  return {
    className: sec.className,
    sectionName: sec.sectionName,
    totalStudents: sec.students.length,
    totalDaysMarked: daysMarked,
    totalPresent,
    boysCount,
    boysPresent,
    girlsCount,
    girlsPresent,
  };
}

/**
 * Session-wide and monthly attendance analytics for a set of sections.
 *
 * Replaces the per-student loop previously duplicated in the admin and
 * teacher attendance pages, which issued 4 COUNT queries per student plus
 * 8 per section (~1,260 queries for 300 students, ~300 sequential waves).
 *
 * Now: 2 groupBy queries for per-student counts + 2 "distinct dates"
 * queries per non-empty section, all fired in ONE parallel wave.
 * Section/gender totals are summed in memory from the per-student counts,
 * which is mathematically identical to the old per-section COUNTs.
 *
 * If sessionId is null, returns zero summaries and no per-student rows
 * (matching the old teacher-page behaviour).
 */
export async function buildPeriodAttendanceAnalytics(
  sessionId: string | null,
  sections: AnalyticsSection[],
  monthStart: Date,
  monthEnd: Date
): Promise<PeriodAnalytics> {
  const result: PeriodAnalytics = {
    sessionStudentData: [],
    sessionClassSummary: [],
    monthlyStudentData: [],
    monthlyClassSummary: [],
  };

  const allIds = sections.flatMap((s) => s.students.map((st) => st.id));

  if (!sessionId || allIds.length === 0) {
    for (const sec of sections) {
      result.sessionClassSummary.push(summarise(sec, 0, null));
      result.monthlyClassSummary.push(summarise(sec, 0, null));
    }
    return result;
  }

  const monthRange = { gte: monthStart, lte: monthEnd };
  const nonEmpty = sections.filter((s) => s.students.length > 0);

  const distinctDays = (ids: string[], withMonth: boolean) =>
    prisma.attendance
      .groupBy({
        by: ["date"],
        where: {
          sessionId,
          studentId: { in: ids },
          ...(withMonth ? { date: monthRange } : {}),
        },
      })
      .then((rows) => rows.length);

  const [sessionRows, monthRows, sessionDays, monthDays] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { sessionId, studentId: { in: allIds } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "status"],
      where: { sessionId, studentId: { in: allIds }, date: monthRange },
      _count: { _all: true },
    }),
    Promise.all(nonEmpty.map((s) => distinctDays(s.students.map((st) => st.id), false))),
    Promise.all(nonEmpty.map((s) => distinctDays(s.students.map((st) => st.id), true))),
  ]);

  const sessionCounts = toCountMap(sessionRows);
  const monthCounts = toCountMap(monthRows);

  let i = 0;
  for (const sec of sections) {
    if (sec.students.length === 0) {
      result.sessionClassSummary.push(summarise(sec, 0, null));
      result.monthlyClassSummary.push(summarise(sec, 0, null));
      continue;
    }
    result.sessionClassSummary.push(summarise(sec, sessionDays[i], sessionCounts));
    result.monthlyClassSummary.push(summarise(sec, monthDays[i], monthCounts));
    i++;

    for (const s of sec.students) {
      const base = {
        id: s.id,
        fullName: s.fullName,
        admissionNo: s.admissionNo,
        className: sec.className,
        sectionName: sec.sectionName,
        gender: s.gender,
      };
      const sc = sessionCounts.get(s.id);
      const mc = monthCounts.get(s.id);
      result.sessionStudentData.push({ ...base, totalDays: sc?.total ?? 0, presentDays: sc?.present ?? 0 });
      result.monthlyStudentData.push({ ...base, totalDays: mc?.total ?? 0, presentDays: mc?.present ?? 0 });
    }
  }

  return result;
}
