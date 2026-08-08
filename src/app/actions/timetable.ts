"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function createTimetableSlotAction({
  sectionId,
  subjectId,
  teacherId,
  dayOfWeek,
  startTime,
  endTime,
  locale,
}: {
  sectionId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 1=Monday...6=Saturday
  startTime: string; // "09:00"
  endTime: string;   // "09:40"
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  await requireRole(["ADMIN"]);

  if (!sectionId || !subjectId || !teacherId || !dayOfWeek || !startTime || !endTime) {
    return { success: false, message: "All fields are required." };
  }

  if (startTime >= endTime) {
    return { success: false, message: "Start time must be before end time." };
  }

  try {
    // 1. Check if teacher is already scheduled elsewhere at this time
    const teacherConflict = await prisma.timetableSlot.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        section: { include: { class: true } },
      },
    });

    if (teacherConflict) {
      return {
        success: false,
        message: `Teacher Conflict: This teacher is already assigned to Class ${teacherConflict.section.class.name} (${teacherConflict.startTime} - ${teacherConflict.endTime}) on this day.`,
      };
    }

    // 2. Check if section is already busy at this time
    const sectionConflict = await prisma.timetableSlot.findFirst({
      where: {
        sectionId,
        dayOfWeek,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      include: {
        subject: true,
      },
    });

    if (sectionConflict) {
      return {
        success: false,
        message: `Section Conflict: This class is already scheduled for "${sectionConflict.subject.name}" (${sectionConflict.startTime} - ${sectionConflict.endTime}) on this day.`,
      };
    }

    // 3. Create the slot
    await prisma.timetableSlot.create({
      data: {
        sectionId,
        subjectId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    revalidatePath(`/${locale}/admin/timetable`);
    return { success: true, message: "Timetable slot successfully added." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create timetable slot.",
    };
  }
}

export async function deleteTimetableSlotAction({
  slotId,
  locale,
}: {
  slotId: string;
  locale: string;
}): Promise<{ success: boolean; message: string }> {
  await requireRole(["ADMIN"]);

  try {
    await prisma.timetableSlot.delete({
      where: { id: slotId },
    });

    revalidatePath(`/${locale}/admin/timetable`);
    return { success: true, message: "Timetable slot successfully deleted." };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete slot.",
    };
  }
}
