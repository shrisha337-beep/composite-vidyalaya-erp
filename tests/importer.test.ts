import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { heuristicMapping } from "@/lib/importer-mapping";
import {
  normaliseClassNumber,
  parseDDMMYYYY,
  validateImportRow,
} from "@/lib/importer-validation";

// Mocks for map-columns route test
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const mockGenerateContent = vi.fn();
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

import { POST } from "@/app/api/admin/students/map-columns/route";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

describe("Importer - Heuristic Column Mapping (Hindi & English Regex)", () => {
  it("correctly maps standard English column headers", () => {
    const headers = [
      "Adm No",
      "Student Full Name",
      "Father's Name",
      "Mother Name",
      "Gender",
      "DOB",
      "Class",
      "Caste Category",
      "Mobile Number",
      "Village",
      "District",
    ];

    const mapping = heuristicMapping(headers);

    expect(mapping["Adm No"]).toBe("admissionNo");
    expect(mapping["Student Full Name"]).toBe("fullName");
    expect(mapping["Father's Name"]).toBe("fatherName");
    expect(mapping["Mother Name"]).toBe("motherName");
    expect(mapping["Gender"]).toBe("gender");
    expect(mapping["DOB"]).toBe("dob");
    expect(mapping["Class"]).toBe("classNumber");
    expect(mapping["Caste Category"]).toBe("category");
    expect(mapping["Mobile Number"]).toBe("mobile");
    expect(mapping["Village"]).toBe("village");
    expect(mapping["District"]).toBe("district");
  });

  it("correctly maps standard Hindi column headers", () => {
    const hindiHeaders = [
      "पंजीयन संख्या",
      "छात्र का नाम",
      "पिता का नाम",
      "माता का नाम",
      "लिंग",
      "जन्म तिथि",
      "कक्षा",
      "जाति",
      "मोबाइल",
      "ग्राम",
      "जिला",
    ];

    const mapping = heuristicMapping(hindiHeaders);

    expect(mapping["पंजीयन संख्या"]).toBe("admissionNo");
    expect(mapping["छात्र का नाम"]).toBe("fullName");
    expect(mapping["पिता का नाम"]).toBe("fatherName");
    expect(mapping["माता का नाम"]).toBe("motherName");
    expect(mapping["लिंग"]).toBe("gender");
    expect(mapping["जन्म तिथि"]).toBe("dob");
    expect(mapping["कक्षा"]).toBe("classNumber");
    expect(mapping["जाति"]).toBe("category");
    expect(mapping["मोबाइल"]).toBe("mobile");
    expect(mapping["ग्राम"]).toBe("village");
    expect(mapping["जिला"]).toBe("district");
  });

  it("does not map unrecognized headers or duplicate assignments", () => {
    // Note: avoid headers with substring 'do' (like 'Random') due to application regex bug /d\/?o/i
    const headers = ["Extra Notes", "Remarks", "Adm No", "Registration No"];
    const mapping = heuristicMapping(headers);

    expect(mapping["Extra Notes"]).toBeUndefined();
    expect(mapping["Remarks"]).toBeUndefined();
    expect(mapping["Adm No"]).toBe("admissionNo");
    // Registration No should not steal admissionNo because it's already assigned
    expect(mapping["Registration No"]).toBeUndefined();
  });

  it("regression: word boundaries in s/o and d/o prevent greedy matching of DOB and Random Column", () => {
    const headers = ["Random Column", "DOB", "D/O Name"];
    const mapping = heuristicMapping(headers);

    // 'Random Column' must NOT match fatherName (would match without word boundaries due to 'do' in Random)
    expect(mapping["Random Column"]).toBeUndefined();

    // 'DOB' must map to dob, NOT fatherName
    expect(mapping["DOB"]).toBe("dob");

    // Legitimate D/O header still correctly maps to fatherName
    expect(mapping["D/O Name"]).toBe("fatherName");
  });
});

describe("Importer - Gemini AI Route & Heuristic Fallback", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "mock-gemini-key";
    (getServerSession as any).mockResolvedValue({
      user: { role: "ADMIN", id: "admin-1" },
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("rejects unauthorized non-admin requests with 401", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { role: "TEACHER", id: "teacher-1" },
    });

    const req = new NextRequest("http://localhost/api/admin/students/map-columns", {
      method: "POST",
      body: JSON.stringify({ headers: ["Name", "Class"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("falls back to heuristic mapping when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new NextRequest("http://localhost/api/admin/students/map-columns", {
      method: "POST",
      body: JSON.stringify({ headers: ["छात्र का नाम", "कक्षा"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.method).toBe("heuristic");
    expect(data.mapping["छात्र का नाम"]).toBe("fullName");
    expect(data.mapping["कक्षा"]).toBe("classNumber");
  });

  it("falls back to heuristic mapping when Gemini API call throws an error", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API rate limit exceeded or network fail"));

    const req = new NextRequest("http://localhost/api/admin/students/map-columns", {
      method: "POST",
      body: JSON.stringify({
        headers: ["Student Name", "Father Name", "Class"],
        sampleRows: [{ "Student Name": "Aarav", "Father Name": "Ramesh", Class: "5" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.method).toBe("heuristic_fallback");
    expect(data.mapping["Student Name"]).toBe("fullName");
    expect(data.mapping["Father Name"]).toBe("fatherName");
    expect(data.mapping["Class"]).toBe("classNumber");
  });

  it("falls back to heuristic mapping when Gemini returns malformed non-JSON output", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "Sorry, I cannot format this as JSON properly...",
      },
    });

    const req = new NextRequest("http://localhost/api/admin/students/map-columns", {
      method: "POST",
      body: JSON.stringify({
        headers: ["Name", "Village"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.method).toBe("heuristic_fallback");
    expect(data.mapping["Name"]).toBe("fullName");
    expect(data.mapping["Village"]).toBe("village");
  });

  it("uses AI mapping when Gemini returns valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ "विद्यार्थी का नाम": "fullName", "श्रेणी": "classNumber" }),
      },
    });

    const req = new NextRequest("http://localhost/api/admin/students/map-columns", {
      method: "POST",
      body: JSON.stringify({
        headers: ["विद्यार्थी का नाम", "श्रेणी"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.method).toBe("ai");
    expect(data.mapping["विद्यार्थी का नाम"]).toBe("fullName");
    expect(data.mapping["श्रेणी"]).toBe("classNumber");
  });
});

describe("Importer - Zod Row Validation & Normalization", () => {
  it("normalizes Roman numerals and class prefixes into digits 1-8", () => {
    expect(normaliseClassNumber("Class 5")).toBe("5");
    expect(normaliseClassNumber("Std 6")).toBe("6");
    expect(normaliseClassNumber("grade 7")).toBe("7");
    expect(normaliseClassNumber("VIII")).toBe("8");
    expect(normaliseClassNumber("iv")).toBe("4");
    expect(normaliseClassNumber("3")).toBe("3");
  });

  it("parses valid DD/MM/YYYY dates and rejects invalid calendar days", () => {
    const d1 = parseDDMMYYYY("15/08/2015");
    expect(d1.getFullYear()).toBe(2015);
    expect(d1.getMonth()).toBe(7); // August (0-indexed)
    expect(d1.getDate()).toBe(15);

    expect(() => parseDDMMYYYY("2015-08-15")).toThrow();
    expect(() => parseDDMMYYYY("31/02/2015")).toThrow("Invalid calendar date");
    expect(() => parseDDMMYYYY("15/13/2015")).toThrow("Invalid date values");
  });

  it("validates and accepts a complete valid student import row", () => {
    const validRow = {
      admissionNo: "ADM-2024-001",
      fullName: "Pooja Kumari",
      fatherName: "Rajesh Kumar",
      motherName: "Sunita Devi",
      gender: "Female",
      dob: "12/04/2016",
      classNumber: "Class 4",
      category: "OBC",
      mobile: "9876543210",
      village: "Kalyanpur",
      district: "Lucknow",
    };

    const res = validateImportRow(validRow);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.classNumber).toBe("4");
      expect(res.data.fullName).toBe("Pooja Kumari");
    }
  });

  it("rejects invalid rows: missing required name or fatherName", () => {
    const missingName = {
      fullName: "",
      fatherName: "Suresh",
      gender: "Male",
      dob: "01/01/2017",
      classNumber: "1",
    };
    const res1 = validateImportRow(missingName);
    expect(res1.success).toBe(false);

    const missingFather = {
      fullName: "Aarav",
      fatherName: "",
      gender: "Male",
      dob: "01/01/2017",
      classNumber: "1",
    };
    const res2 = validateImportRow(missingFather);
    expect(res2.success).toBe(false);
  });

  it("rejects invalid rows: invalid gender", () => {
    const invalidGender = {
      fullName: "Aarav",
      fatherName: "Suresh",
      gender: "Unknown",
      dob: "01/01/2017",
      classNumber: "1",
    };
    const res = validateImportRow(invalidGender);
    expect(res.success).toBe(false);
  });

  it("rejects invalid rows: class outside 1 to 8", () => {
    const class9 = {
      fullName: "Aarav",
      fatherName: "Suresh",
      gender: "Male",
      dob: "01/01/2017",
      classNumber: "9",
    };
    expect(validateImportRow(class9).success).toBe(false);

    const class0 = {
      fullName: "Aarav",
      fatherName: "Suresh",
      gender: "Male",
      dob: "01/01/2017",
      classNumber: "0",
    };
    expect(validateImportRow(class0).success).toBe(false);
  });
});
