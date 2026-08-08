"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { decrypt, encrypt, encryptOptional } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateStudent(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const locale = (formData.get("locale") as string) ?? "en";
  const studentId = (formData.get("studentId") as string)?.trim();
  const userId = (formData.get("userId") as string)?.trim();

  if (!studentId || !userId) {
    redirect(`/${locale}/admin/students`);
  }

  const fullName = (formData.get("fullName") as string)?.trim();
  const admissionNo = (formData.get("admissionNo") as string)?.trim();
  const classNumber = (formData.get("classNumber") as string)?.trim();
  const dobRaw = (formData.get("dob") as string)?.trim();
  const gender = (formData.get("gender") as string)?.trim() as "MALE" | "FEMALE" | "OTHER";

  if (!fullName || !admissionNo || !classNumber || !dobRaw || !gender) {
    redirect(
      `/${locale}/admin/students/${studentId}/edit?error=${encodeURIComponent(
        "Name, admission number, class, date of birth and gender are required."
      )}`
    );
  }

  const dob = new Date(dobRaw);

  // Check if admission number is taken by a DIFFERENT student
  const dupAdmNo = await prisma.student.findFirst({
    where: { admissionNo, NOT: { id: studentId } },
    select: { id: true },
  });
  if (dupAdmNo) {
    redirect(
      `/${locale}/admin/students/${studentId}/edit?error=${encodeURIComponent(
        `Admission number "${admissionNo}" is already used by another student.`
      )}`
    );
  }

  // Resolve section
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  const section = currentSession
    ? await prisma.section.findFirst({
        where: { class: { name: classNumber, sessionId: currentSession.id } },
        select: { id: true },
      })
    : null;

  if (!section) {
    redirect(
      `/${locale}/admin/students/${studentId}/edit?error=${encodeURIComponent(
        `Class ${classNumber} not found in the current session.`
      )}`
    );
  }

  // Update student core fields
  await prisma.student.update({
    where: { id: studentId },
    data: {
      admissionNo,
      fullName,
      dob,
      dobInWords: (formData.get("dobInWords") as string)?.trim() || null,
      gender,
      aadhaarNumber: encryptOptional((formData.get("studentAadhaar") as string)?.trim()),
      category: (formData.get("category") as string)?.trim() || null,
      subCaste: (formData.get("subCaste") as string)?.trim() || null,
      religion: (formData.get("religion") as string)?.trim() || null,
      rationCardType: ((formData.get("rationCardType") as string)?.trim() || null) as
        | "APL" | "BPL" | "ANTYODAYA" | null,
      disabilityType: (formData.get("disabilityType") as string)?.trim() || null,
      villageOrMohalla: (formData.get("villageOrMohalla") as string)?.trim() || null,
      postOffice: (formData.get("postOffice") as string)?.trim() || null,
      developmentBlock: (formData.get("developmentBlock") as string)?.trim() || null,
      district: (formData.get("district") as string)?.trim() || null,
      pincode: (formData.get("pincode") as string)?.trim() || null,
      durationOfStayInUP: (formData.get("durationOfStayInUP") as string)?.trim() || null,
      mobileNumber: (formData.get("mobileNumber") as string)?.trim() || null,
      whatsappNumber: (formData.get("whatsappNumber") as string)?.trim() || null,
      previousClassPassed: (formData.get("previousClassPassed") as string)?.trim() || null,
      previousSchoolName: (formData.get("previousSchoolName") as string)?.trim() || null,
      sectionId: section!.id,
    },
  });

  // Update phone on User if mobile changed and it's not a NOPHONE placeholder
  const mobileNumber = (formData.get("mobileNumber") as string)?.trim();
  if (mobileNumber) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    if (existingUser?.phone.startsWith("NOPHONE-")) {
      // Check the new phone isn't taken
      const phoneConflict = await prisma.user.findUnique({
        where: { phone: mobileNumber },
        select: { id: true },
      });
      if (!phoneConflict) {
        await prisma.user.update({
          where: { id: userId },
          data: { phone: mobileNumber },
        });
      }
    }
  }

  // Upsert guardians
  const guardianRelations: ("FATHER" | "MOTHER" | "GUARDIAN")[] = ["FATHER", "MOTHER", "GUARDIAN"];
  const nameKeys: Record<string, string> = {
    FATHER: "fatherName",
    MOTHER: "motherName",
    GUARDIAN: "guardianName",
  };
  const aadhaarKeys: Record<string, string> = {
    FATHER: "fatherAadhaar",
    MOTHER: "motherAadhaar",
    GUARDIAN: "guardianAadhaar",
  };

  for (const rel of guardianRelations) {
    const name = (formData.get(nameKeys[rel]) as string)?.trim();
    const aadhaar = (formData.get(aadhaarKeys[rel]) as string)?.trim();
    const occupation = rel === "FATHER"
      ? (formData.get("occupation") as string)?.trim() || null
      : null;

    if (name) {
      const existingGuardian = await prisma.guardian.findFirst({
        where: { studentId, relation: rel },
        select: { id: true },
      });

      if (existingGuardian) {
        await prisma.guardian.update({
          where: { id: existingGuardian.id },
          data: {
            fullName: name,
            aadhaarNumber: encryptOptional(aadhaar),
            occupation,
          },
        });
      } else {
        await prisma.guardian.create({
          data: {
            studentId,
            relation: rel,
            fullName: name,
            aadhaarNumber: encryptOptional(aadhaar),
            occupation,
            isPrimaryContact: rel === "FATHER",
          },
        });
      }
    }
  }

  // Upsert bank details
  const accountHolder = (formData.get("bankAccountHolder") as string)?.trim();
  const bankName = (formData.get("bankName") as string)?.trim();
  const accountNumber = (formData.get("accountNumber") as string)?.trim();
  const ifscCode = (formData.get("ifscCode") as string)?.trim();

  if (accountHolder && bankName && accountNumber && ifscCode) {
    await prisma.bankDetail.upsert({
      where: { studentId },
      create: {
        studentId,
        accountHolder,
        relationToStudent: ((formData.get("bankRelation") as string) ?? "FATHER") as
          "FATHER" | "MOTHER" | "GUARDIAN",
        bankName,
        branchName: (formData.get("branchName") as string)?.trim() || null,
        accountNumber: encrypt(accountNumber) ?? accountNumber,
        ifscCode,
        accountHolderAadhaar: encryptOptional((formData.get("bankHolderAadhaar") as string)?.trim()),
        mobileNumber: (formData.get("bankMobile") as string)?.trim() || null,
        isAadhaarSeeded: formData.get("isAadhaarSeeded") === "true",
        isSameFamilyMember: formData.get("isSameFamilyMember") !== "false",
      },
      update: {
        accountHolder,
        relationToStudent: ((formData.get("bankRelation") as string) ?? "FATHER") as
          "FATHER" | "MOTHER" | "GUARDIAN",
        bankName,
        branchName: (formData.get("branchName") as string)?.trim() || null,
        accountNumber: encrypt(accountNumber) ?? accountNumber,
        ifscCode,
        accountHolderAadhaar: encryptOptional((formData.get("bankHolderAadhaar") as string)?.trim()),
        mobileNumber: (formData.get("bankMobile") as string)?.trim() || null,
        isAadhaarSeeded: formData.get("isAadhaarSeeded") === "true",
        isSameFamilyMember: formData.get("isSameFamilyMember") !== "false",
      },
    });
  }

  revalidatePath(`/${locale}/admin/students/${studentId}`);
  revalidatePath(`/${locale}/admin/students`);
  redirect(`/${locale}/admin/students/${studentId}`);
}
