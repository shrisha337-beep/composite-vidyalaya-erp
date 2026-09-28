"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

/**
 * Update non-legal fields of an already-issued Transfer Certificate.
 *
 * Editable fields: reason, conduct, promotedTo, remarks, workingDays,
 * subjectsStudied, lastClassStudied, dates.
 *
 * Frozen (never editable): all snapshot fields (student name, DOB, Aadhaar,
 * PEN, APAAR, father/mother names, category, religion, address).
 */
export async function updateTransferCertificate({
  tcId,
  reasonForLeaving,
  conduct,
  lastClassStudied,
  dateOfLeaving,
  dateOfIssue,
  promotedTo,
  workingDaysTotal,
  workingDaysPresent,
  qualifiedForPromotion,
  subjectsStudied,
  remarks,
  locale = "en",
}: {
  tcId: string;
  reasonForLeaving: string;
  conduct: string;
  lastClassStudied: string;
  dateOfLeaving: string;
  dateOfIssue: string;
  promotedTo: string;
  workingDaysTotal: number;
  workingDaysPresent: number;
  qualifiedForPromotion: boolean;
  subjectsStudied: string[];
  remarks: string;
  locale?: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);

  if (!tcId) {
    return { success: false, message: "TC ID is required." };
  }

  if (!reasonForLeaving?.trim() || !lastClassStudied?.trim()) {
    return {
      success: false,
      message: "Reason for leaving and last class studied are required.",
    };
  }

  // Verify the TC exists and is ISSUED (not VOID)
  const existingTc = await prisma.transferCertificate.findUnique({
    where: { id: tcId },
    select: {
      id: true,
      status: true,
      studentId: true,
      reasonForLeaving: true,
      conduct: true,
      lastClassStudied: true,
      dateOfLeaving: true,
      dateOfIssue: true,
      promotedTo: true,
      workingDaysTotal: true,
      workingDaysPresent: true,
      qualifiedForPromotion: true,
      subjectsStudied: true,
      remarks: true,
    },
  });

  if (!existingTc) {
    return { success: false, message: "Transfer Certificate not found." };
  }

  if (existingTc.status === "VOID") {
    return {
      success: false,
      message: "Cannot edit a voided Transfer Certificate.",
    };
  }

  // Build before/after metadata for audit log
  const beforeData = {
    reasonForLeaving: existingTc.reasonForLeaving,
    conduct: existingTc.conduct,
    lastClassStudied: existingTc.lastClassStudied,
    dateOfLeaving: existingTc.dateOfLeaving?.toISOString(),
    dateOfIssue: existingTc.dateOfIssue?.toISOString(),
    promotedTo: existingTc.promotedTo,
    workingDaysTotal: existingTc.workingDaysTotal,
    workingDaysPresent: existingTc.workingDaysPresent,
    qualifiedForPromotion: existingTc.qualifiedForPromotion,
    subjectsStudied: existingTc.subjectsStudied,
    remarks: existingTc.remarks,
  };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update the TC record
      await tx.transferCertificate.update({
        where: { id: tcId },
        data: {
          reasonForLeaving: reasonForLeaving.trim(),
          conduct: conduct.trim() || "Good",
          lastClassStudied: lastClassStudied.trim(),
          dateOfLeaving: new Date(dateOfLeaving),
          dateOfIssue: new Date(dateOfIssue),
          promotedTo: promotedTo.trim() || null,
          workingDaysTotal,
          workingDaysPresent,
          qualifiedForPromotion,
          subjectsStudied,
          remarks: remarks.trim() || null,
          // Clear cached PDF so next download regenerates
          fileUrl: null,
        },
      });

      // 2. Audit log — record the edit with before/after delta
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TC_EDIT",
          entityType: "TransferCertificate",
          entityId: tcId,
          metadata: {
            before: beforeData,
            after: {
              reasonForLeaving: reasonForLeaving.trim(),
              conduct: conduct.trim() || "Good",
              lastClassStudied: lastClassStudied.trim(),
              dateOfLeaving,
              dateOfIssue,
              promotedTo: promotedTo.trim() || null,
              workingDaysTotal,
              workingDaysPresent,
              qualifiedForPromotion,
              subjectsStudied,
              remarks: remarks.trim() || null,
            },
          },
        },
      });
    });

    revalidatePath(`/${locale}/admin/students/${existingTc.studentId}`);
    revalidatePath(`/${locale}/admin/students/${existingTc.studentId}/tc`);

    return {
      success: true,
      message: "Transfer Certificate updated successfully.",
    };
  } catch (error) {
    console.error("Error updating TC:", error);
    return {
      success: false,
      message: "Failed to update Transfer Certificate. Please try again.",
    };
  }
}

/**
 * Delete a Transfer Certificate and re-activate the student.
 * - Sets student.isActive = true, transferredOutAt = null
 * - Re-enables the student's user portal login
 * - Logs the deletion to audit
 */
export async function deleteTransferCertificateAction({
  tcId,
  locale = "en",
}: {
  tcId: string;
  locale?: string;
}): Promise<{ success: boolean; message: string }> {
  const session = await requireRole(["ADMIN"]);

  if (!tcId) {
    return { success: false, message: "TC ID is required." };
  }

  const existingTc = await prisma.transferCertificate.findUnique({
    where: { id: tcId },
    select: {
      id: true,
      tcNumber: true,
      studentId: true,
      student: {
        select: {
          id: true,
          fullName: true,
          userId: true,
        },
      },
    },
  });

  if (!existingTc) {
    return { success: false, message: "Transfer Certificate not found." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete the TC record
      await tx.transferCertificate.delete({
        where: { id: tcId },
      });

      // 2. Re-activate the student
      await tx.student.update({
        where: { id: existingTc.studentId },
        data: {
          isActive: true,
          transferredOutAt: null,
        },
      });

      // 3. Re-enable student portal login
      await tx.user.update({
        where: { id: existingTc.student.userId },
        data: {
          isActive: true,
        },
      });

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TC_DELETE",
          entityType: "TransferCertificate",
          entityId: tcId,
          metadata: {
            tcNumber: existingTc.tcNumber,
            studentId: existingTc.studentId,
            studentName: existingTc.student.fullName,
          },
        },
      });
    });

    revalidatePath(`/${locale}/admin/students/${existingTc.studentId}`);
    revalidatePath(`/${locale}/admin/students`);
    revalidatePath(`/${locale}/admin/reports/tc`);

    return {
      success: true,
      message: `TC #${existingTc.tcNumber} deleted. ${existingTc.student.fullName} has been re-activated.`,
    };
  } catch (error) {
    console.error("Error deleting TC:", error);
    return {
      success: false,
      message: "Failed to delete Transfer Certificate. Please try again.",
    };
  }
}

