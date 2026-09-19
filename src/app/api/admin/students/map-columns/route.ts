import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Target fields that the import system expects ────────────────────────────

const TARGET_FIELDS = [
  { key: "admissionNo", label: "Admission Number", description: "Student's admission/registration number" },
  { key: "fullName", label: "Student Name", description: "Full name of the student" },
  { key: "fatherName", label: "Father's Name", description: "Father's full name" },
  { key: "motherName", label: "Mother's Name", description: "Mother's full name" },
  { key: "gender", label: "Gender", description: "Male, Female, or Other" },
  { key: "dob", label: "Date of Birth", description: "Student's date of birth" },
  { key: "classNumber", label: "Class", description: "Class number (1-8)" },
  { key: "category", label: "Category/Caste", description: "Social category like General, OBC, SC, ST, EWS" },
  { key: "mobile", label: "Mobile Number", description: "Parent/guardian phone number" },
  { key: "village", label: "Village/Mohalla", description: "Residential village or locality" },
  { key: "district", label: "District", description: "District name" },
];

// ── API route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = (await req.json()) as {
    headers: string[];
    sampleRows: Record<string, string>[];
  };

  if (!Array.isArray(body.headers) || body.headers.length === 0) {
    return NextResponse.json({ error: "No headers provided" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fall back to basic heuristic matching when no API key
    const mapping = heuristicMapping(body.headers);
    return NextResponse.json({ mapping, method: "heuristic" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = buildPrompt(body.headers, body.sampleRows ?? []);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON response
    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(text);
    } catch {
      // If JSON parsing fails, fall back to heuristic
      mapping = heuristicMapping(body.headers);
      return NextResponse.json({ mapping, method: "heuristic_fallback" });
    }

    // Validate: only allow known target field keys
    const validKeys = new Set(TARGET_FIELDS.map((f) => f.key));
    const cleanMapping: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (typeof field === "string" && validKeys.has(field)) {
        cleanMapping[header] = field;
      }
    }

    return NextResponse.json({ mapping: cleanMapping, method: "ai" });
  } catch (err) {
    console.error("Gemini API error:", err);
    // Fall back to heuristic on any API failure
    const mapping = heuristicMapping(body.headers);
    return NextResponse.json({ mapping, method: "heuristic_fallback" });
  }
}

// ── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(
  headers: string[],
  sampleRows: Record<string, string>[]
): string {
  const targetFieldsDescription = TARGET_FIELDS.map(
    (f) => `  - "${f.key}": ${f.label} — ${f.description}`
  ).join("\n");

  const sampleDataSection =
    sampleRows.length > 0
      ? `\n\nHere are a few sample data rows to help with mapping:\n${JSON.stringify(sampleRows.slice(0, 3), null, 2)}`
      : "";

  return `You are a data mapping assistant for an Indian school management system.

The user has uploaded an Excel file with the following column headers:
${JSON.stringify(headers)}
${sampleDataSection}

Map each Excel column header to one of these target fields:
${targetFieldsDescription}

Rules:
1. Headers may be in Hindi (e.g., "छात्र का नाम" = fullName, "पिता का नाम" = fatherName, "कक्षा" = classNumber).
2. Headers may be abbreviated (e.g., "Adm No" = admissionNo, "DOB" = dob, "Mob" = mobile).
3. If a header clearly doesn't match any target field, do NOT include it in the mapping.
4. Each target field should be mapped at most once.
5. Use sample data to disambiguate when headers are vague (e.g., a "Name" column with values like "Ram Kumar" is likely fullName, while one with "Suresh Kumar" adjacent to it might be fatherName — use row context).
6. Common Indian patterns: "S/O" or "D/O" prefixes in father name columns, "जनपद" = district, "ग्राम" = village, "मो.नं." or "मोबाइल" = mobile.

Respond with ONLY a JSON object mapping each matched Excel header to its target field key.
Example: {"Student Name": "fullName", "Father Name": "fatherName", "Class": "classNumber"}`;
}

// ── Heuristic fallback (no API key needed) ──────────────────────────────────

function heuristicMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  // Keyword patterns for each field (lowercase matching)
  const patterns: [string, RegExp[]][] = [
    ["admissionNo", [/admi?ss?ion\s*n/i, /पंजीयन/i, /adm\s*no/i, /reg.*no/i, /sr\s*no/i, /क्रमांक/i]],
    ["fullName", [/student.*name/i, /छात्र.*नाम/i, /बालक.*नाम/i, /^name$/i, /^नाम$/i, /full\s*name/i, /pupil/i]],
    ["fatherName", [/father/i, /पिता/i, /s\/?o/i, /d\/?o/i]],
    ["motherName", [/mother/i, /माता/i]],
    ["gender", [/gender/i, /sex/i, /लिंग/i]],
    ["dob", [/d\.?o\.?b/i, /birth/i, /जन्म.*तिथि/i, /जन्म.*दिनांक/i, /date.*birth/i]],
    ["classNumber", [/class/i, /कक्षा/i, /^cls$/i]],
    ["category", [/caste/i, /categ/i, /जाति/i, /वर्ग/i, /sc.*st/i]],
    ["mobile", [/mobile/i, /phone/i, /मोबाइल/i, /मो.*नं/i, /contact/i, /दूरभाष/i]],
    ["village", [/village/i, /mohall?a/i, /ग्राम/i, /मोहल्ला/i, /निवास/i, /address/i, /पता/i]],
    ["district", [/district/i, /जनपद/i, /जिला/i]],
  ];

  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    for (const [field, regexes] of patterns) {
      if (used.has(field)) continue;
      if (regexes.some((r) => r.test(headerLower))) {
        mapping[header] = field;
        used.add(field);
        break;
      }
    }
  }

  return mapping;
}
