"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/data/academic-session";

export interface StudentFruitEntry {
  studentId: string;
  didEat: boolean;
}

export async function saveMDMFruitLogAction({
  dateString,
  fruitEntries,
  locale = "en",
}: {
  dateString: string;
  fruitEntries: StudentFruitEntry[];
  locale?: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);
  const userId = session.user.id;

  if (!dateString) {
    return { success: false, message: "Missing date parameter." };
  }

  const logDate = new Date(dateString);
  if (isNaN(logDate.getTime())) {
    return { success: false, message: "Invalid date provided." };
  }
  logDate.setHours(0, 0, 0, 0);

  // 1. Fetch active session
  const activeSession = await getCurrentSession();

  if (!activeSession) {
    return { success: false, message: "No active academic session found." };
  }

  // 2. Count total eligible and present students on that date
  const nextDay = new Date(logDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const [totalStudents, presentAttendance] = await Promise.all([
    prisma.student.count(),
    prisma.attendance.findMany({
      where: {
        date: { gte: logDate, lt: nextDay },
        status: "PRESENT",
      },
      select: { studentId: true },
    }),
  ]);

  const presentStudentIds = new Set(presentAttendance.map((a) => a.studentId));
  const fruitsEatenCount = fruitEntries.filter((e) => e.didEat).length;

  try {
    await prisma.$transaction(async (tx) => {
      // Upsert daily log for LUNCH/MDM
      const dailyLog = await tx.mDMDailyLog.upsert({
        where: {
          date_mealType: {
            date: logDate,
            mealType: "LUNCH",
          },
        },
        create: {
          sessionId: activeSession.id,
          date: logDate,
          mealType: "LUNCH",
          menuDescription: "Primary: 100g + Junior: 150g + Fruit (₹4) + Conversion Cost",
          eligibleStudents: totalStudents,
          presentStudents: presentStudentIds.size,
          mealsServed: presentStudentIds.size,
          loggedById: userId,
        },
        update: {
          eligibleStudents: totalStudents,
          presentStudents: presentStudentIds.size,
          mealsServed: presentStudentIds.size,
          loggedById: userId,
        },
      });

      // Batch fruit consumption records: delete existing + bulk insert.
      // Two queries instead of N upserts.
      await tx.mDMStudentAttendance.deleteMany({
        where: { dailyLogId: dailyLog.id },
      });
      if (fruitEntries.length > 0) {
        await tx.mDMStudentAttendance.createMany({
          data: fruitEntries.map((entry) => ({
            dailyLogId: dailyLog.id,
            studentId: entry.studentId,
            didEat: entry.didEat,
          })),
        });
      }
    });

    revalidatePath(`/${locale}/admin/mdm`);
    revalidatePath(`/${locale}/admin/dashboard`);

    return {
      success: true,
      message: `Updated fruit consumption: ${fruitsEatenCount} students recorded as ate fruit.`,
    };
  } catch (error) {
    console.error("Error saving MDM log:", error);
    return { success: false, message: "Failed to save MDM records. Please try again." };
  }
}
