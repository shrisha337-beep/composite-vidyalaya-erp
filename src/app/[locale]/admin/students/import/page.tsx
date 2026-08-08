"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Upload, Download, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Column definitions ──────────────────────────────────────────────────────

const COLUMNS = [
  { key: "admissionNo",  label: "Admission No",    required: false, note: "Leave blank to auto-assign" },
  { key: "fullName",     label: "Full Name",        required: true  },
  { key: "fatherName",   label: "Father's Name",    required: true  },
  { key: "motherName",   label: "Mother's Name",    required: false },
  { key: "gender",       label: "Gender",           required: true,  note: "Male / Female / Other" },
  { key: "dob",          label: "Date of Birth",    required: true,  note: "DD/MM/YYYY" },
  { key: "classNumber",  label: "Class",            required: true,  note: "1 to 8" },
  { key: "category",     label: "Category",         required: false, note: "General / OBC / SC / ST / EWS" },
  { key: "mobile",       label: "Mobile Number",    required: false, note: "10 digits; leave blank if unknown" },
  { key: "village",      label: "Village / Mohalla",required: false },
  { key: "district",     label: "District",         required: false },
];

// ── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = COLUMNS.map((c) => c.label);
  const example = [
    "",               // Admission No
    "Ram Kumar",      // Full Name
    "Suresh Kumar",   // Father's Name
    "Sunita Devi",    // Mother's Name
    "Male",           // Gender
    "15/08/2014",     // DOB
    "5",              // Class
    "OBC",            // Category
    "9876543210",     // Mobile
    "Chandpur",       // Village
    "Bijnor",         // District
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  // Style header row width
  ws["!cols"] = COLUMNS.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "student_import_template.xlsx");
}

// ── Parse uploaded file ──────────────────────────────────────────────────────

function parseExcel(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          header: COLUMNS.map((c) => c.key),
          range: 1, // skip header row
          defval: "",
        });
        resolve(rows.filter((r) => Object.values(r).some((v) => v !== "")));
      } catch {
        reject(new Error("Could not read file. Make sure it is a valid .xlsx file."));
      }
    };
    reader.onerror = () => reject(new Error("File read error."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  admissionNo: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  gender: string;
  dob: string;
  classNumber: string;
  category: string;
  mobile: string;
  village: string;
  district: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: "created" | "error";
  reason?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    created: number;
    failed: ImportResult[];
    results: ImportResult[];
  } | null>(null);

  // ── Handle file selection ────────────────────────────────────────────────

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    try {
      const parsed = await parseExcel(file);
      if (parsed.length === 0) {
        setParseError("No data rows found in the file.");
        return;
      }
      setRows(parsed as unknown as ParsedRow[]);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // ── Confirm import ───────────────────────────────────────────────────────

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Import failed.");
        setImporting(false);
        return;
      }
      setResults(data);
      setStep("done");
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="../students"
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bulk Import Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload an Excel file to add multiple students at once
          </p>
        </div>
      </div>

      {/* Step 1 — Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Step 1: Download template */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Download the template
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Fill in student details in this file. Do not change column headers.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Download template (.xlsx)
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Upload filled file */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Upload the filled file
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Only .xlsx files are accepted. Maximum 500 students per file.
                </p>

                {parseError && (
                  <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-100 rounded px-3 py-2">
                    {parseError}
                  </p>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFile}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="flex items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Click to select .xlsx file
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Column guide */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-700">
                Column guide
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Column</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Required</th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {COLUMNS.map((c) => (
                    <tr key={c.key}>
                      <td className="px-4 py-2 font-medium text-gray-700">{c.label}</td>
                      <td className="px-4 py-2">
                        {c.required ? (
                          <span className="text-red-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{c.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{rows.length}</span> students found in file.
              Review before importing.
            </p>
            <button
              onClick={() => { setStep("upload"); setRows([]); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Choose different file
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">#</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Name</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Father</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Gender</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">DOB</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Class</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Mobile</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Adm. No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr key={i} className={!r.fullName || !r.fatherName || !r.gender || !r.dob || !r.classNumber ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{i + 2}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{r.fullName || <span className="text-red-500">Missing</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{r.fatherName || <span className="text-red-500">Missing</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{r.gender}</td>
                      <td className="px-3 py-2 text-gray-600">{r.dob}</td>
                      <td className="px-3 py-2 text-gray-600">{r.classNumber ? `Class ${r.classNumber}` : <span className="text-red-500">Missing</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{r.mobile || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{r.admissionNo || <span className="text-gray-400 italic">auto</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {parseError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {parseError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "hsl(var(--primary))" }}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>Import {rows.length} students</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Done */}
      {step === "done" && results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700">{results.created}</p>
                <p className="text-xs text-green-600">students imported</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-600">{results.failed.length}</p>
                <p className="text-xs text-red-500">rows failed</p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {results.failed.length > 0 && (
            <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                <p className="text-sm font-medium text-red-700">
                  Rows that failed — fix in your file and re-import
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {results.failed.map((f) => (
                  <div key={f.row} className="px-4 py-3 flex items-start gap-3">
                    <span className="text-xs text-gray-400 mt-0.5 shrink-0">Row {f.row}</span>
                    <span className="text-sm font-medium text-gray-700 shrink-0">{f.name}</span>
                    <span className="text-sm text-red-600">{f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push("../students")}
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: "hsl(var(--primary))" }}
            >
              View student list
            </button>
            {results.failed.length > 0 && (
              <button
                onClick={() => { setStep("upload"); setRows([]); setResults(null); }}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Import more
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
