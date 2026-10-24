import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateImportRow, parseDDMMYYYY } from "@/lib/importer-validation";

interface ImportRow {
  admissionNo?: string;
  fullName: string;
  fatherName: string;
  motherName?: string;
  gender: string;
  dob: string; // DD/MM/YYYY
  classNumber: string; // "1"–"8"
  category?: string;
  mobile?: string;
  village?: string;
  district?: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: "created" | "error";
  reason?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json() as { rows: ImportRow[] };
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  // Get current academic session
  const academicSession = await prisma.academicSession.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  });
  if (!academicSession) {
    return NextResponse.json(
      { error: "No active academic session. Set one up first." },
      { status: 400 }
    );
  }

  // Pre-load all sections for current session (class name → section id)
  const sections = await prisma.section.findMany({
    where: { class: { sessionId: academicSession.id } },
    include: { class: true },
  });
  const sectionByClass = new Map(sections.map((s) => [s.class.name, s.id]));

  // Get existing admission numbers to detect duplicates
  const existingAdmNos = new Set(
    (await prisma.student.findMany({ select: { admissionNo: true } })).map(
      (s) => s.admissionNo
    )
  );

  // Get the highest existing auto-generated number for sequential assignment
  let autoCounter = existingAdmNos.size + 1;

  const results: ImportResult[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    // ── Validate row with pure importer-validation ────────────────────────
    const validation = validateImportRow(row);
    if (!validation.success) {
      const reason = validation.error.issues[0]?.message ?? "Validation failed";
      results.push({
        row: rowNum,
        name: row.fullName?.trim() || "(blank)",
        status: "error",
        reason,
      });
      continue;
    }

    const validatedRow = validation.data;
    const dob = parseDDMMYYYY(validatedRow.dob);

    // ── Admission number ──────────────────────────────────────────────────
    let admissionNo = validatedRow.admissionNo?.trim();
    if (!admissionNo) {
      admissionNo = String(autoCounter++).padStart(3, "0");
    }
    if (existingAdmNos.has(admissionNo)) {
      results.push({ row: rowNum, name: validatedRow.fullName, status: "error", reason: `Admission number "${admissionNo}" already exists` });
      continue;
    }
    existingAdmNos.add(admissionNo); // reserve for rest of this batch

    // ── Section lookup ────────────────────────────────────────────────────
    const sectionId = sectionByClass.get(validatedRow.classNumber);
    if (!sectionId) {
      results.push({ row: rowNum, name: validatedRow.fullName, status: "error", reason: `Class ${validatedRow.classNumber} not found — run session setup first` });
      continue;
    }

    // ── Gender normalise ──────────────────────────────────────────────────
    const genderMap: Record<string, "MALE" | "FEMALE" | "OTHER"> = {
      male: "MALE", female: "FEMALE", other: "OTHER",
      "m": "MALE", "f": "FEMALE",
    };
    const gender = genderMap[validatedRow.gender.toLowerCase()] ?? "OTHER";

    // ── Create User + Student ─────────────────────────────────────────────
    try {
      // Phone: use provided mobile, or a placeholder that won't collide
      const phone = validatedRow.mobile?.trim()
        ? validatedRow.mobile.trim()
        : `IMPORT-${admissionNo}-${Date.now()}`;

      // Temporary password hash (student changes on first login)
      const passwordHash = await bcrypt.hash("School@123", 10);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            role: "STUDENT",
            phone,
            passwordHash,
            isActive: true,
          },
        });

        await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            fullName: validatedRow.fullName.trim(),
            dob,
            gender,
            sectionId,
            mobileNumber: validatedRow.mobile?.trim() || null,
            category: validatedRow.category?.trim() || null,
            villageOrMohalla: validatedRow.village?.trim() || null,
            district: validatedRow.district?.trim() || null,
            guardians: {
              create: [
                {
                  relation: "FATHER",
                  fullName: validatedRow.fatherName.trim(),
                  isPrimaryContact: true,
                },
                ...(validatedRow.motherName?.trim()
                  ? [{ relation: "MOTHER" as const, fullName: validatedRow.motherName.trim() }]
                  : []),
              ],
            },
          },
        });
      });

      results.push({ row: rowNum, name: row.fullName, status: "created" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      // Detect duplicate phone
      if (msg.includes("Unique constraint") && msg.includes("phone")) {
        results.push({ row: rowNum, name: row.fullName, status: "error", reason: "Mobile number already used by another student" });
      } else {
        results.push({ row: rowNum, name: row.fullName, status: "error", reason: "Database error — check if this student already exists" });
      }
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const failed = results.filter((r) => r.status === "error");

  return NextResponse.json({ created, failed, results });
}
