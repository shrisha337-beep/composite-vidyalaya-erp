"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function issueTransferCertificate(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const locale = (formData.get("locale") as string) ?? "en";
  const studentId = (formData.get("studentId") as string)?.trim();

  if (!studentId) {
    throw new Error("Student ID is required.");
  }

  // ── Collect TC specific form fields ───────────────────────────────────────
  const tcNumber = (formData.get("tcNumber") as string)?.trim();
  let reasonForLeaving = (formData.get("reasonForLeaving") as string)?.trim();
  // If "Other" was selected, use the custom text from the separate field
  if (reasonForLeaving === "__OTHER__") {
    const otherReason = (formData.get("reasonForLeavingOther") as string)?.trim();
    reasonForLeaving = otherReason || "";
  }
  const conduct = (formData.get("conduct") as string)?.trim() || "Good";
  const lastClassStudied = (formData.get("lastClassStudied") as string)?.trim();
  const dateOfLeavingRaw = (formData.get("dateOfLeaving") as string)?.trim();
  const dateOfIssueRaw = (formData.get("dateOfIssue") as string)?.trim();

  // Additional details from the physical form
  const bookNumber = ""; // Removed from form — no longer used
  const schoolDistrict = (formData.get("schoolDistrict") as string)?.trim() || "";
  const schoolBlock = (formData.get("schoolBlock") as string)?.trim() || "";
  const dobInWordsForm = (formData.get("dobInWords") as string)?.trim() || "";
  const passedHigherExam = (formData.get("passedHigherExam") as string)?.trim() || "";
  const passedHigherExamDate = (formData.get("passedHigherExamDate") as string)?.trim() || "";
  const struckClass = (formData.get("struckClass") as string)?.trim() || "";
  const studentMedium = (formData.get("studentMedium") as string)?.trim() || "Hindi / हिन्दी";
  const classStartDate = (formData.get("classStartDate") as string)?.trim() || "";
  const schoolWorkingDays = Number(formData.get("schoolWorkingDays") || 0);
  const studentWorkingDays = Number(formData.get("studentWorkingDays") || 0);
  const promotedToClass = (formData.get("promotedToClass") as string)?.trim() || "";
  const remarks = (formData.get("remarks") as string)?.trim() || "";

  if (!tcNumber || !reasonForLeaving || !lastClassStudied || !dateOfLeavingRaw || !dateOfIssueRaw) {
    redirect(
      `/${locale}/admin/students/${studentId}/tc?error=${encodeURIComponent(
        "Book/Serial Number, Reason for Leaving, Class, Date of Leaving, and Date of Issue are required."
      )}`
    );
  }

  // Verify unique TC Number
  const existingTc = await prisma.transferCertificate.findUnique({
    where: { tcNumber },
    select: { id: true },
  });
  if (existingTc) {
    redirect(
      `/${locale}/admin/students/${studentId}/tc?error=${encodeURIComponent(
        `Serial Number "${tcNumber}" has already been used on another TC.`
      )}`
    );
  }

  const dateOfLeaving = new Date(dateOfLeavingRaw);
  const dateOfIssue = new Date(dateOfIssueRaw);

  // Fetch current student profile details
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      guardians: true,
      section: { include: { class: { include: { session: true } } } },
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  // Decrypt sensitive fields for snapshotting
  const studentAadhaarDecrypted = decrypt(student.aadhaarNumber);
  const father = student.guardians.find((g) => g.relation === "FATHER");
  const mother = student.guardians.find((g) => g.relation === "MOTHER");

  const fatherName = father?.fullName || "";
  const motherName = mother?.fullName || "";

  // Get active session user context
  const currentSessionLabel = student.section?.class?.session?.label || "";

  // Build subjects studied list
  const subjectsStudied = [
    "Hindi",
    "English",
    "Mathematics",
    "Science",
    "Social Science",
    "Sanskrit/Urdu",
    "Art/Physical Education",
  ];

  await prisma.$transaction(async (tx) => {
    // 1. Create TransferCertificate snapshot
    await tx.transferCertificate.create({
      data: {
        studentId,
        tcNumber,
        studentNameSnapshot: student.fullName,
        fatherNameSnapshot: fatherName,
        motherNameSnapshot: motherName,
        dobSnapshot: student.dob,
        dobWordsSnapshot: dobInWordsForm || student.dobInWords,
        aadhaarSnapshot: studentAadhaarDecrypted,
        penNumberSnapshot: student.penNumber,
        apaarIdSnapshot: student.apaarId,
        categorySnapshot: student.category,
        religionSnapshot: student.religion,
        addressSnapshot: [
          student.villageOrMohalla,
          student.postOffice,
          student.developmentBlock,
          student.district,
          student.pincode,
        ]
          .filter(Boolean)
          .join(", "),
        dateOfIssue,
        admissionDateSnapshot: student.admissionDate,
        classOfAdmissionSnapshot: student.previousClassPassed,
        lastClassStudied,
        currentSessionLabel,
        dateOfLeaving,
        reasonForLeaving,
        conduct,
        subjectsStudied,
        promotedTo: promotedToClass || null,
        workingDaysTotal: schoolWorkingDays,
        workingDaysPresent: studentWorkingDays,
        remarks,
        issuedById: "SYSTEM", // Placeholder for actual issuing user session
      },
    });

    // 2. Mark student as inactive & transferred out
    await tx.student.update({
      where: { id: studentId },
      data: {
        isActive: false,
        transferredOutAt: dateOfLeaving,
      },
    });

    // 3. Deactivate student portal login
    await tx.user.update({
      where: { id: student.userId },
      data: {
        isActive: false,
      },
    });
  });

  revalidatePath(`/${locale}/admin/students/${studentId}`);
  revalidatePath(`/${locale}/admin/students`);
  redirect(`/${locale}/admin/students/${studentId}`);
}
