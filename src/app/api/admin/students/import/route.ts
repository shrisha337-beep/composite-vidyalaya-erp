import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    // ── Validate required fields ──────────────────────────────────────────
    if (!row.fullName?.trim()) {
      results.push({ row: rowNum, name: row.fullName ?? "(blank)", status: "error", reason: "Name is required" });
      continue;
    }
    if (!row.fatherName?.trim()) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: "Father's name is required" });
      continue;
    }
    if (!["male", "female", "other"].includes(row.gender?.toLowerCase?.() ?? "")) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: `Invalid gender "${row.gender}" — use Male, Female, or Other` });
      continue;
    }
    if (!row.dob?.trim()) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: "Date of birth is required" });
      continue;
    }
    if (!["1","2","3","4","5","6","7","8"].includes(String(row.classNumber).trim())) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: `Invalid class "${row.classNumber}" — must be 1 to 8` });
      continue;
    }

    // ── Parse DOB ─────────────────────────────────────────────────────────
    let dob: Date;
    try {
      const [dd, mm, yyyy] = row.dob.trim().split("/");
      dob = new Date(`${yyyy}-${mm}-${dd}`);
      if (isNaN(dob.getTime())) throw new Error();
    } catch {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: `Invalid date "${row.dob}" — use DD/MM/YYYY` });
      continue;
    }

    // ── Admission number ──────────────────────────────────────────────────
    let admissionNo = row.admissionNo?.trim();
    if (!admissionNo) {
      admissionNo = String(autoCounter++).padStart(3, "0");
    }
    if (existingAdmNos.has(admissionNo)) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: `Admission number "${admissionNo}" already exists` });
      continue;
    }
    existingAdmNos.add(admissionNo); // reserve for rest of this batch

    // ── Section lookup ────────────────────────────────────────────────────
    const sectionId = sectionByClass.get(String(row.classNumber).trim());
    if (!sectionId) {
      results.push({ row: rowNum, name: row.fullName, status: "error", reason: `Class ${row.classNumber} not found — run session setup first` });
      continue;
    }

    // ── Gender normalise ──────────────────────────────────────────────────
    const genderMap: Record<string, "MALE" | "FEMALE" | "OTHER"> = {
      male: "MALE", female: "FEMALE", other: "OTHER",
      "m": "MALE", "f": "FEMALE",
    };
    const gender = genderMap[row.gender.toLowerCase()] ?? "OTHER";

    // ── Create User + Student ─────────────────────────────────────────────
    try {
      // Phone: use provided mobile, or a placeholder that won't collide
      const phone = row.mobile?.trim()
        ? row.mobile.trim()
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
            fullName: row.fullName.trim(),
            dob,
            gender,
            sectionId,
            mobileNumber: row.mobile?.trim() || null,
            category: row.category?.trim() || null,
            villageOrMohalla: row.village?.trim() || null,
            district: row.district?.trim() || null,
            guardians: {
              create: [
                {
                  relation: "FATHER",
                  fullName: row.fatherName.trim(),
                  isPrimaryContact: true,
                },
                ...(row.motherName?.trim()
                  ? [{ relation: "MOTHER" as const, fullName: row.motherName.trim() }]
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
