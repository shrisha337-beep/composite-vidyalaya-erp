"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { encrypt, encryptOptional } from "@/lib/encryption";
import {
  generateInitialStudentPassword,
  isValidAdmissionNo,
} from "@/lib/student-credentials";

// ── Types ────────────────────────────────────────────────────────────────────

interface GuardianInput {
  relation: "FATHER" | "MOTHER" | "GUARDIAN";
  fullName: string;
  aadhaarNumber?: string;
  occupation?: string;
  isPrimaryContact?: boolean;
}

interface SiblingInput {
  fullName: string;
  relation: "BROTHER" | "SISTER";
  dob?: string;
  enrolledSchoolName?: string;
  isEnrolled: boolean;
  reasonNotEnrolled?: string;
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadFile(
  file: File,
  folder: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const blob = await put(filename, file, { access: "public" });
  return blob.url;
}

// ── Main server action ────────────────────────────────────────────────────────

export async function createStudent(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const locale = (formData.get("locale") as string) ?? "en";

  // ── Required fields ──────────────────────────────────────────────────────
  const fullName = (formData.get("fullName") as string)?.trim();
  const admissionNoInput = (formData.get("admissionNo") as string)?.trim();
  const classNumber = (formData.get("classNumber") as string)?.trim();
  const dobRaw = (formData.get("dob") as string)?.trim();
  const gender = (formData.get("gender") as string)?.trim() as
    | "MALE"
    | "FEMALE"
    | "OTHER";

  if (!fullName || !classNumber || !dobRaw || !gender) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        "Name, class, date of birth and gender are required."
      )}`
    );
  }

  // ── Auto-generate admission number if not provided ───────────────────────
  let admissionNo = admissionNoInput;
  if (!admissionNo) {
    // Find the highest existing numeric admission number and increment
    const last = await prisma.student.findFirst({
      orderBy: { admissionNo: "desc" },
      select: { admissionNo: true },
    });
    const lastNum = last ? parseInt(last.admissionNo, 10) || 0 : 0;
    admissionNo = String(lastNum + 1).padStart(4, "0");
  }

  if (!isValidAdmissionNo(admissionNo)) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        "Admission number cannot be a 10-digit mobile number."
      )}`
    );
  }

  // ── Duplicate checks (run in parallel) ────────────────────────────────────
  const studentAadhaarForCheck = (formData.get("studentAadhaar") as string)?.trim() || null;
  const fatherNameForCheck = (formData.get("fatherName") as string)?.trim() || null;
  const dobForCheck = dobRaw ? new Date(dobRaw) : null;

  const [dupAdmNo, dupAadhaar, dupNameDobFather] = await Promise.all([
    // 1. Admission number
    prisma.student.findUnique({ where: { admissionNo }, select: { id: true } }),

    // 2. Aadhaar number (only if provided)
    studentAadhaarForCheck
      ? prisma.student.findUnique({
          where: { aadhaarNumber: studentAadhaarForCheck },
          select: { fullName: true },
        })
      : Promise.resolve(null),

    // 3. Same name + DOB + father's name
    fatherNameForCheck && dobForCheck
      ? prisma.student.findFirst({
          where: {
            fullName: { equals: fullName, mode: "insensitive" },
            dob: dobForCheck,
            guardians: {
              some: {
                relation: "FATHER",
                fullName: { equals: fatherNameForCheck, mode: "insensitive" },
              },
            },
          },
          select: { admissionNo: true },
        })
      : Promise.resolve(null),
  ]);

  if (dupAdmNo) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        `Admission number "${admissionNo}" is already used by another student.`
      )}`
    );
  }
  if (dupAadhaar) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        `This Aadhaar number is already registered for student: ${dupAadhaar.fullName}`
      )}`
    );
  }
  if (dupNameDobFather) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        `A student with the same name, date of birth, and father's name already exists (Admission No: ${dupNameDobFather.admissionNo}). Please verify before adding again.`
      )}`
    );
  }


  // ── Resolve section ──────────────────────────────────────────────────────
  const currentSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  if (!currentSession) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        "No active academic session found. Set one up under Classes first."
      )}`
    );
  }

  const section = await prisma.section.findFirst({
    where: { class: { name: classNumber, sessionId: currentSession!.id } },
    select: { id: true },
  });
  if (!section) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        `Class ${classNumber} not found in the current session.`
      )}`
    );
  }

  // ── Parse DOB ────────────────────────────────────────────────────────────
  const dob = new Date(dobRaw);
  if (isNaN(dob.getTime())) {
    redirect(
      `/${locale}/admin/students/new?error=${encodeURIComponent(
        "Invalid date of birth."
      )}`
    );
  }

  // ── Optional fields ──────────────────────────────────────────────────────
  const studentAadhaar = (formData.get("studentAadhaar") as string)?.trim() || null;
  const dobInWords = (formData.get("dobInWords") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || null;
  const subCaste = (formData.get("subCaste") as string)?.trim() || null;
  const religion = (formData.get("religion") as string)?.trim() || null;
  const rationCardType = (formData.get("rationCardType") as string)?.trim() || null;
  const disabilityType = (formData.get("disabilityType") as string)?.trim() || null;
  const villageOrMohalla = (formData.get("villageOrMohalla") as string)?.trim() || null;
  const postOffice = (formData.get("postOffice") as string)?.trim() || null;
  const developmentBlock = (formData.get("developmentBlock") as string)?.trim() || null;
  const district = (formData.get("district") as string)?.trim() || null;
  const pincode = (formData.get("pincode") as string)?.trim() || null;
  const durationOfStayInUP = (formData.get("durationOfStayInUP") as string)?.trim() || null;
  const mobileNumber = (formData.get("mobileNumber") as string)?.trim() || null;
  const whatsappNumber = (formData.get("whatsappNumber") as string)?.trim() || null;
  const previousClassPassed = (formData.get("previousClassPassed") as string)?.trim() || null;
  const previousSchoolName = (formData.get("previousSchoolName") as string)?.trim() || null;

  // ── Guardians ────────────────────────────────────────────────────────────
  const guardians: GuardianInput[] = [];

  const fatherName = (formData.get("fatherName") as string)?.trim();
  if (fatherName) {
    guardians.push({
      relation: "FATHER",
      fullName: fatherName,
      aadhaarNumber: (formData.get("fatherAadhaar") as string)?.trim() || undefined,
      occupation: (formData.get("occupation") as string)?.trim() || undefined,
      isPrimaryContact: true,
    });
  }

  const motherName = (formData.get("motherName") as string)?.trim();
  if (motherName) {
    guardians.push({
      relation: "MOTHER",
      fullName: motherName,
      aadhaarNumber: (formData.get("motherAadhaar") as string)?.trim() || undefined,
    });
  }

  const guardianName = (formData.get("guardianName") as string)?.trim();
  if (guardianName) {
    guardians.push({
      relation: "GUARDIAN",
      fullName: guardianName,
      aadhaarNumber: (formData.get("guardianAadhaar") as string)?.trim() || undefined,
    });
  }

  // ── Siblings ─────────────────────────────────────────────────────────────
  const siblings: SiblingInput[] = [];
  const siblingCount = Number(formData.get("siblingCount") ?? 0);
  for (let i = 0; i < siblingCount; i++) {
    const name = (formData.get(`sibling_name_${i}`) as string)?.trim();
    if (!name) continue;
    siblings.push({
      fullName: name,
      relation: (formData.get(`sibling_relation_${i}`) as string) === "SISTER"
        ? "SISTER"
        : "BROTHER",
      dob: (formData.get(`sibling_dob_${i}`) as string)?.trim() || undefined,
      enrolledSchoolName: (formData.get(`sibling_school_${i}`) as string)?.trim() || undefined,
      isEnrolled: formData.get(`sibling_enrolled_${i}`) === "true",
      reasonNotEnrolled: (formData.get(`sibling_reason_${i}`) as string)?.trim() || undefined,
    });
  }

  // ── Bank details ─────────────────────────────────────────────────────────
  const accountHolder = (formData.get("bankAccountHolder") as string)?.trim();
  const bankName = (formData.get("bankName") as string)?.trim();
  const accountNumber = (formData.get("accountNumber") as string)?.trim();
  const ifscCode = (formData.get("ifscCode") as string)?.trim();

  const hasBankDetails = accountHolder && bankName && accountNumber && ifscCode;

  // ── File uploads ─────────────────────────────────────────────────────────
  const studentPhotoFile = formData.get("file_studentPhoto") as File | null;
  const studentAadhaarFile = formData.get("file_studentAadhaar") as File | null;
  const fatherAadhaarFile = formData.get("file_fatherAadhaar") as File | null;
  const motherAadhaarFile = formData.get("file_motherAadhaar") as File | null;
  const bankPassbookFile = formData.get("file_bankPassbook") as File | null;

  const [
    studentPhotoUrl,
    studentAadhaarUrl,
    fatherAadhaarUrl,
    motherAadhaarUrl,
    bankPassbookUrl,
  ] = await Promise.all([
    uploadFile(studentPhotoFile!, `students/photos`),
    uploadFile(studentAadhaarFile!, `students/aadhaar`),
    uploadFile(fatherAadhaarFile!, `students/aadhaar`),
    uploadFile(motherAadhaarFile!, `students/aadhaar`),
    uploadFile(bankPassbookFile!, `students/bank`),
  ]);

  // ── Create records in a transaction ──────────────────────────────────────
  const phone = mobileNumber ?? `NOPHONE-${admissionNo}-${Date.now()}`; // admissionNo guaranteed non-null by this point
  const bcrypt = await import("bcryptjs");
  const initialPassword = generateInitialStudentPassword();
  const passwordHash = await bcrypt.hash(initialPassword, 10);

  let studentId: string;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: "STUDENT",
        phone,
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        admissionNo,
        fullName,
        dob,
        dobInWords,
        gender,
        aadhaarNumber: encryptOptional(studentAadhaar),
        category,
        subCaste,
        religion,
        rationCardType: rationCardType as "APL" | "BPL" | "ANTYODAYA" | null,
        disabilityType,
        villageOrMohalla,
        postOffice,
        developmentBlock,
        district,
        pincode,
        durationOfStayInUP,
        mobileNumber,
        whatsappNumber,
        previousClassPassed,
        previousSchoolName,
        sectionId: section!.id,
        photoUrl: studentPhotoUrl,
        guardians: {
          create: guardians.map((g) => ({
            relation: g.relation,
            fullName: g.fullName,
            aadhaarNumber: encryptOptional(g.aadhaarNumber),
            occupation: g.occupation ?? null,
            isPrimaryContact: g.isPrimaryContact ?? false,
          })),
        },
        ...(siblings.length > 0
          ? {
              siblings: {
                create: siblings.map((s) => ({
                  fullName: s.fullName,
                  relation: s.relation,
                  dob: s.dob ? new Date(s.dob) : null,
                  enrolledSchoolName: s.enrolledSchoolName ?? null,
                  isEnrolled: s.isEnrolled,
                  reasonNotEnrolled: s.reasonNotEnrolled ?? null,
                })),
              },
            }
          : {}),
        ...(hasBankDetails
          ? {
              bankDetails: {
                create: {
                  accountHolder: accountHolder!,
                  relationToStudent: (formData.get("bankRelation") as "FATHER" | "MOTHER" | "GUARDIAN") ?? "FATHER",
                  bankName: bankName!,
                  branchName: (formData.get("branchName") as string)?.trim() || null,
                  accountNumber: encrypt(accountNumber!) ?? accountNumber!,
                  ifscCode: ifscCode!,
                  accountHolderAadhaar: encryptOptional((formData.get("bankHolderAadhaar") as string)?.trim()),
                  mobileNumber: (formData.get("bankMobile") as string)?.trim() || null,
                  isAadhaarSeeded: formData.get("isAadhaarSeeded") === "true",
                  isSameFamilyMember: formData.get("isSameFamilyMember") !== "false",
                },
              },
            }
          : {}),
      },
    });

    studentId = student.id;

    // Save uploaded documents
    const docs: { type: string; url: string }[] = [
      { type: "PHOTO", url: studentAadhaarUrl ?? "" },
      { type: "AADHAAR", url: studentAadhaarUrl ?? "" },
      { type: "AADHAAR", url: fatherAadhaarUrl ?? "" },
      { type: "AADHAAR", url: motherAadhaarUrl ?? "" },
      { type: "BANK_PASSBOOK", url: bankPassbookUrl ?? "" },
    ].filter((d) => d.url);

    if (docs.length > 0) {
      await tx.studentDocument.createMany({
        data: docs.map((d) => ({
          studentId: student.id,
          type: d.type as "PHOTO" | "AADHAAR" | "BANK_PASSBOOK",
          fileUrl: d.url,
        })),
      });
    }
  });

  revalidatePath(`/${locale}/admin/students`);
  redirect(`/${locale}/admin/students/${studentId!}`);
}
