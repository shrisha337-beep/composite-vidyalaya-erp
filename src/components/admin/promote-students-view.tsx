"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { promoteStudentsAction } from "@/app/actions/promote-students";
import { ArrowLeft, Loader, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface StudentRow {
  id: string;
  admissionNo: string;
  fullName: string;
  fatherName: string;
}

interface AcademicSessionOption {
  id: string;
  label: string;
}

export function PromoteStudentsView({
  locale,
  currentSessionLabel,
  sessions,
  classes,
  students,
  selectedSourceClass,
  selectedTargetSessionId,
  selectedTargetClass,
}: {
  locale: string;
  currentSessionLabel: string;
  sessions: AcademicSessionOption[];
  classes: string[];
  students: StudentRow[];
  selectedSourceClass: string;
  selectedTargetSessionId: string;
  selectedTargetClass: string;
}) {
  const router = useRouter();

  type DecisionsState = Record<string, { action: "PROMOTE" | "RETAIN"; marks: string; selected: boolean }>;

  // State to hold individual decisions
  const [decisions, setDecisions] = useState<DecisionsState>(() => {
    const initial: DecisionsState = {};
    students.forEach((s) => {
      initial[s.id] = { action: "PROMOTE", marks: "", selected: true };
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function handleSelectSourceClass(val: string) {
    router.push(`/${locale}/admin/students/promote?sourceClass=${val}&targetSession=${selectedTargetSessionId}&targetClass=${selectedTargetClass}`);
  }

  function handleSelectTargetSession(val: string) {
    router.push(`/${locale}/admin/students/promote?sourceClass=${selectedSourceClass}&targetSession=${val}&targetClass=${selectedTargetClass}`);
  }

  function handleSelectTargetClass(val: string) {
    router.push(`/${locale}/admin/students/promote?sourceClass=${selectedSourceClass}&targetSession=${selectedTargetSessionId}&targetClass=${val}`);
  }

  function toggleSelectAll(checked: boolean) {
    setDecisions((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        if (updated[s.id]) {
          updated[s.id].selected = checked;
        }
      });
      return updated;
    });
  }

  function updateStudentAction(id: string, action: "PROMOTE" | "RETAIN") {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], action },
    }));
  }

  function updateStudentMarks(id: string, marks: string) {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], marks },
    }));
  }

  function toggleStudentSelected(id: string, selected: boolean) {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], selected },
    }));
  }

  async function handlePromoteSubmit() {
    setErrorMsg("");
    setSuccessMsg("");

    // Prepare payload
    const payload = students
      .filter((s) => decisions[s.id]?.selected)
      .map((s) => ({
        studentId: s.id,
        action: decisions[s.id].action,
        marks: decisions[s.id].marks,
      }));

    if (payload.length === 0) {
      setErrorMsg("Please select at least one student to promote.");
      return;
    }

    setLoading(true);
    try {
      const res = await promoteStudentsAction({
        studentDecisions: payload,
        targetSessionId: selectedTargetSessionId,
        targetClassVal: selectedTargetClass,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        // Refresh after short delay
        setTimeout(() => {
          router.push(`/${locale}/admin/students`);
        }, 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const allSelected = students.length > 0 && students.every((s) => decisions[s.id]?.selected);

  return (
    <div className="space-y-6">
      {/* ── ALERTS ──────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── FILTER HEADER ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          Session & Class Select / सत्र एवं कक्षा चयन
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Source Class Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Source Class (Session: {currentSessionLabel})
            </label>
            <select
              value={selectedSourceClass}
              onChange={(e) => handleSelectSourceClass(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          {/* Target Session Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Target Academic Session
            </label>
            <select
              value={selectedTargetSessionId}
              onChange={(e) => handleSelectTargetSession(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select Target Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Class Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Target Class (New Level)
            </label>
            <select
              value={selectedTargetClass}
              onChange={(e) => handleSelectTargetClass(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select Class</option>
              {["1", "2", "3", "4", "5", "6", "7", "8"].map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── STUDENTS LIST ───────────────────────────────────────────────── */}
      {selectedSourceClass && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Student List / छात्र सूची ({students.length} found)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure promotion rules for each student below.
              </p>
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded-md">
              No students found in Class {selectedSourceClass} for the current session.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                      <th className="py-2.5 px-3">Adm No</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Father's Name</th>
                      <th className="py-2.5 px-3 w-44">Promotion Decision</th>
                      <th className="py-2.5 px-3 w-32">Marks / Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s) => {
                      const dec = decisions[s.id] || { action: "PROMOTE", marks: "", selected: true };
                      return (
                        <tr
                          key={s.id}
                          className={[
                            "hover:bg-gray-50/50 transition-colors",
                            !dec.selected ? "opacity-50" : "",
                          ].join(" ")}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={dec.selected}
                              onChange={(e) => toggleStudentSelected(s.id, e.target.checked)}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-gray-600">
                            {s.admissionNo}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">
                            {s.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">{s.fatherName}</td>
                          <td className="py-2.5 px-3">
                            <select
                              value={dec.action}
                              disabled={!dec.selected}
                              onChange={(e) =>
                                updateStudentAction(s.id, e.target.value as "PROMOTE" | "RETAIN")
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none w-full disabled:bg-gray-50"
                            >
                              <option value="PROMOTE">Promote / प्रोन्नत करें</option>
                              <option value="RETAIN">Retain / अनुत्तीर्ण/रोकें</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="e.g. 78%"
                              value={dec.marks}
                              disabled={!dec.selected}
                              onChange={(e) => updateStudentMarks(s.id, e.target.value)}
                              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none w-full disabled:bg-gray-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handlePromoteSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-green-600 hover:bg-green-700 disabled:opacity-65"
                >
                  {loading && <Loader className="h-4 w-4 animate-spin" />}
                  Confirm Bulk Promotion / प्रोन्नति लागू करें
                </button>

                <Link
                  href={`/${locale}/admin/students`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel / निरस्त करें
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
