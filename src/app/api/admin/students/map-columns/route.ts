import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { TARGET_FIELDS, heuristicMapping, buildPrompt } from "@/lib/importer-mapping";

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

