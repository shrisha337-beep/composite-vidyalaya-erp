"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ── Column definitions ──────────────────────────────────────────────────────

const TARGET_FIELDS = [
  { key: "admissionNo", label: "Admission No", required: false, note: "Leave blank to auto-assign" },
  { key: "fullName", label: "Full Name", required: true },
  { key: "fatherName", label: "Father's Name", required: true },
  { key: "motherName", label: "Mother's Name", required: false },
  { key: "gender", label: "Gender", required: true, note: "Male / Female / Other" },
  { key: "dob", label: "Date of Birth", required: true, note: "DD/MM/YYYY" },
  { key: "classNumber", label: "Class", required: true, note: "1 to 8" },
  { key: "category", label: "Category", required: false, note: "General / OBC / SC / ST / EWS" },
  { key: "mobile", label: "Mobile Number", required: false, note: "10 digits; leave blank if unknown" },
  { key: "village", label: "Village / Mohalla", required: false },
  { key: "district", label: "District", required: false },
];

// ── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = TARGET_FIELDS.map((c) => c.label);
  const example = [
    "",
    "Ram Kumar",
    "Suresh Kumar",
    "Sunita Devi",
    "Male",
    "15/08/2014",
    "5",
    "OBC",
    "9876543210",
    "Chandpur",
    "Bijnor",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = TARGET_FIELDS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "student_import_template.xlsx");
}

// ── Parse uploaded file (raw — preserves original headers) ───────────────────

function parseExcelRaw(
  file: File
): Promise<{ headers: string[]; rawRows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Get headers from first row
        const allRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
        });

        if (allRows.length === 0) {
          reject(new Error("No data rows found in the file."));
          return;
        }

        const headers = Object.keys(allRows[0]);
        resolve({
          headers,
          rawRows: allRows.filter((r) =>
            Object.values(r).some((v) => String(v).trim() !== "")
          ),
        });
      } catch {
        reject(
          new Error("Could not read file. Make sure it is a valid .xlsx file.")
        );
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

type ColumnMapping = Record<string, string>; // sourceHeader → targetFieldKey

// ── Apply mapping to convert raw rows to ParsedRows ─────────────────────────

function applyMapping(
  rawRows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedRow[] {
  // Invert: targetKey → sourceHeader
  const reverseMap: Record<string, string> = {};
  for (const [src, tgt] of Object.entries(mapping)) {
    reverseMap[tgt] = src;
  }

  return rawRows.map((raw) => {
    const row: Record<string, string> = {};
    for (const field of TARGET_FIELDS) {
      const sourceHeader = reverseMap[field.key];
      row[field.key] = sourceHeader ? String(raw[sourceHeader] ?? "").trim() : "";
    }
    return row as unknown as ParsedRow;
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  // Raw data from Excel
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Column mapping
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingMethod, setMappingMethod] = useState<string>("");
  const [mappingLoading, setMappingLoading] = useState(false);

  // Mapped rows for preview
  const [rows, setRows] = useState<ParsedRow[]>([]);

  const [parseError, setParseError] = useState("");
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "done">(
    "upload"
  );
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
      const { headers, rawRows: parsed } = await parseExcelRaw(file);
      if (parsed.length === 0) {
        setParseError("No data rows found in the file.");
        return;
      }
      setRawHeaders(headers);
      setRawRows(parsed);

      // Auto-detect column mapping
      setMappingLoading(true);
      setStep("mapping");

      try {
        const res = await fetch("/api/admin/students/map-columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            sampleRows: parsed.slice(0, 3),
          }),
        });
        const data = await res.json();
        if (data.mapping) {
          setMapping(data.mapping);
          setMappingMethod(data.method ?? "unknown");
        }
      } catch {
        // Silently continue with empty mapping — user can map manually
      } finally {
        setMappingLoading(false);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  // ── Update a single mapping entry ────────────────────────────────────────

  function updateMapping(sourceHeader: string, targetField: string) {
    setMapping((prev) => {
      const next = { ...prev };

      // If targetField is already mapped from a different source, remove that
      if (targetField) {
        for (const [key, val] of Object.entries(next)) {
          if (val === targetField && key !== sourceHeader) {
            delete next[key];
          }
        }
      }

      if (targetField === "") {
        delete next[sourceHeader];
      } else {
        next[sourceHeader] = targetField;
      }
      return next;
    });
  }

  // ── Confirm mapping and go to preview ────────────────────────────────────

  function confirmMapping() {
    const mapped = applyMapping(rawRows, mapping);
    setRows(mapped);
    setStep("preview");
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

  // ── Reset ────────────────────────────────────────────────────────────────

  function resetAll() {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setMappingMethod("");
    setRows([]);
    setResults(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Helpers for mapping UI ───────────────────────────────────────────────

  const usedTargets = new Set(Object.values(mapping));

  function getSampleValues(header: string): string[] {
    return rawRows
      .slice(0, 3)
      .map((r) => String(r[header] ?? "").trim())
      .filter(Boolean);
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
          <h1 className="text-xl font-semibold text-gray-900">
            Bulk Import Students
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload an Excel file to add multiple students at once
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {(
          [
            ["upload", "Upload"],
            ["mapping", "Map Columns"],
            ["preview", "Preview"],
            ["done", "Done"],
          ] as [string, string][]
        ).map(([key, label], i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-6 h-px bg-gray-200" />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === key
                  ? "bg-gray-800 text-white"
                  : ["upload", "mapping", "preview", "done"].indexOf(step) >
                    ["upload", "mapping", "preview", "done"].indexOf(key)
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <span className="w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold">
                {i + 1}
              </span>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ──────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Download template */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Download the template (optional)
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  You can use our template, or upload your school&apos;s own
                  Excel file — we&apos;ll auto-detect the columns.
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

          {/* Upload file */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  Upload your Excel file
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Any .xlsx file with student data — columns can be in any
                  order, even with Hindi headers.
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
                Supported fields
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">
                      Field
                    </th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">
                      Required
                    </th>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {TARGET_FIELDS.map((c) => (
                    <tr key={c.key}>
                      <td className="px-4 py-2 font-medium text-gray-700">
                        {c.label}
                      </td>
                      <td className="px-4 py-2">
                        {c.required ? (
                          <span className="text-red-600 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {c.note ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Column Mapping ──────────────────────────────────────── */}
      {step === "mapping" && (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {mappingLoading
                  ? "Analyzing your columns…"
                  : mappingMethod === "ai"
                  ? "AI has auto-detected your column mapping"
                  : "Column mapping detected"}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {mappingLoading
                  ? "Please wait while we figure out which column is which."
                  : "Review the mapping below and adjust any incorrect matches. Unmapped columns will be ignored."}
              </p>
            </div>
          </div>

          {mappingLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="text-sm text-gray-500">
                Detecting columns…
              </p>
            </div>
          ) : (
            <>
              {/* Mapping table */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                          Excel Column Header
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                          Sample Data
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                          →
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                          Maps To
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rawHeaders.map((header) => {
                        const currentTarget = mapping[header] || "";
                        const samples = getSampleValues(header);

                        return (
                          <tr
                            key={header}
                            className={
                              currentTarget
                                ? "bg-white"
                                : "bg-gray-50/50"
                            }
                          >
                            <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">
                              {header}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 max-w-48 truncate">
                              {samples.length > 0
                                ? samples.join(", ")
                                : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-gray-300">
                              <ArrowRight className="h-3.5 w-3.5" />
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={currentTarget}
                                onChange={(e) =>
                                  updateMapping(header, e.target.value)
                                }
                                className={`w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white ${
                                  currentTarget
                                    ? "border-green-300 text-gray-800"
                                    : "border-gray-300 text-gray-400"
                                }`}
                              >
                                <option value="">
                                  — Skip (don&apos;t import) —
                                </option>
                                {TARGET_FIELDS.map((f) => (
                                  <option
                                    key={f.key}
                                    value={f.key}
                                    disabled={
                                      usedTargets.has(f.key) &&
                                      currentTarget !== f.key
                                    }
                                  >
                                    {f.label}
                                    {f.required ? " *" : ""}
                                    {usedTargets.has(f.key) &&
                                    currentTarget !== f.key
                                      ? " (already mapped)"
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Required field check */}
              {(() => {
                const missingRequired = TARGET_FIELDS.filter(
                  (f) => f.required && !usedTargets.has(f.key)
                );
                if (missingRequired.length === 0) return null;
                return (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <span className="font-medium shrink-0">
                      Missing required fields:
                    </span>
                    <span>
                      {missingRequired.map((f) => f.label).join(", ")}
                    </span>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={confirmMapping}
                  disabled={
                    // Must have at least fullName mapped
                    !usedTargets.has("fullName")
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium text-white disabled:opacity-60 transition-colors"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <ArrowRight className="h-4 w-4" />
                  Confirm mapping & preview
                </button>
                <button
                  onClick={resetAll}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Choose different file
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Preview ─────────────────────────────────────────────── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{rows.length}</span> students found
              in file. Review before importing.
            </p>
            <button
              onClick={() => setStep("mapping")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Adjust mapping
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      #
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Name
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Father
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Gender
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      DOB
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Class
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Mobile
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">
                      Adm. No
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className={
                        !r.fullName ||
                        !r.fatherName ||
                        !r.gender ||
                        !r.dob ||
                        !r.classNumber
                          ? "bg-red-50"
                          : ""
                      }
                    >
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {i + 2}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {r.fullName || (
                          <span className="text-red-500">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.fatherName || (
                          <span className="text-red-500">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.gender}</td>
                      <td className="px-3 py-2 text-gray-600">{r.dob}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.classNumber ? (
                          `Class ${r.classNumber}`
                        ) : (
                          <span className="text-red-500">Missing</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.mobile || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                        {r.admissionNo || (
                          <span className="text-gray-400 italic">auto</span>
                        )}
                      </td>
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

      {/* ── Step 4: Done ────────────────────────────────────────────────── */}
      {step === "done" && results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {results.created}
                </p>
                <p className="text-xs text-green-600">students imported</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {results.failed.length}
                </p>
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
                  <div
                    key={f.row}
                    className="px-4 py-3 flex items-start gap-3"
                  >
                    <span className="text-xs text-gray-400 mt-0.5 shrink-0">
                      Row {f.row}
                    </span>
                    <span className="text-sm font-medium text-gray-700 shrink-0">
                      {f.name}
                    </span>
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
                onClick={resetAll}
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
