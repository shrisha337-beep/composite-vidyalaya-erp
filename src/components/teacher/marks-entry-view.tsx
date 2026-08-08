"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveStudentMarksAction } from "@/app/actions/save-marks";
import { CheckCircle2, AlertCircle, Loader, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface SubjectOption {
  id: string;
  name: string;
}

interface StudentMarkRow {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: string;
  currentMarks?: number | null;
}

const TERM_MAX_MARKS = {
  UNIT_TEST_1: 10,
  UNIT_TEST_2: 10,
  HALF_YEARLY: 30,
  ANNUAL: 50,
};

export function MarksEntryView({
  locale,
  classes,
  subjects,
  students,
  selectedClass,
  selectedSubjectId,
  selectedTerm,
}: {
  locale: string;
  classes: string[];
  subjects: SubjectOption[];
  students: StudentMarkRow[];
  selectedClass: string;
  selectedSubjectId: string;
  selectedTerm: "UNIT_TEST_1" | "UNIT_TEST_2" | "HALF_YEARLY" | "ANNUAL" | "";
}) {
  const router = useRouter();

  type MarksState = Record<string, string>;

  // State to hold marks values
  const [marks, setMarks] = useState<MarksState>(() => {
    const initial: MarksState = {};
    students.forEach((s) => {
      initial[s.id] = s.currentMarks !== null && s.currentMarks !== undefined ? String(s.currentMarks) : "";
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync marks state when student roster changes
  useEffect(() => {
    const updated: Record<string, string> = {};
    students.forEach((s) => {
      updated[s.id] = s.currentMarks !== null && s.currentMarks !== undefined ? String(s.currentMarks) : "";
    });
    setMarks(updated);
  }, [students]);

  function handleClassChange(val: string) {
    // Clear subject when class changes since subjects are class-specific
    router.push(`/${locale}/teacher/marks-entry?class=${val}&subjectId=&term=${selectedTerm}`);
  }

  function handleSubjectChange(val: string) {
    router.push(`/${locale}/teacher/marks-entry?class=${selectedClass}&subjectId=${val}&term=${selectedTerm}`);
  }

  function handleTermChange(val: string) {
    router.push(`/${locale}/teacher/marks-entry?class=${selectedClass}&subjectId=${selectedSubjectId}&term=${val}`);
  }

  function updateMarksValue(id: string, value: string) {
    setMarks((prev) => ({
      ...prev,
      [id]: value,
    }));
  }

  async function handleSaveMarks() {
    setSuccessMsg("");
    setErrorMsg("");

    if (!selectedSubjectId || !selectedTerm) {
      setErrorMsg("Subject and Exam Term are required.");
      return;
    }

    const maxLimit = TERM_MAX_MARKS[selectedTerm];

    // Filter out rows where no marks were entered, convert to records
    const records = [];
    for (const s of students) {
      const valStr = marks[s.id]?.trim();
      if (!valStr) continue; // skip empty entries, or we can treat them as 0 if desired

      const num = Number(valStr);
      if (isNaN(num) || num < 0 || num > maxLimit) {
        setErrorMsg(`Invalid marks entered for ${s.fullName}. Limit is 0 to ${maxLimit} marks.`);
        return;
      }
      records.push({
        studentId: s.id,
        marksObtained: num,
      });
    }

    if (records.length === 0) {
      setErrorMsg("No marks have been entered to save.");
      return;
    }

    setLoading(true);
    try {
      const res = await saveStudentMarksAction({
        marksRecords: records,
        subjectId: selectedSubjectId,
        examTerm: selectedTerm,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while saving student marks.");
    } finally {
      setLoading(false);
    }
  }

  const activeMaxLimit = selectedTerm ? TERM_MAX_MARKS[selectedTerm] : 0;

  return (
    <div className="space-y-6">
      {/* Alerts */}
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

      {/* STEP 1: Filter Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">
          Exam & Roster Filter / परीक्षा एवं सूची फिल्टर
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class Select */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Select Class / कक्षा चुनें
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
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

          {/* Subject Select */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Select Subject / विषय चुनें
            </label>
            <select
              value={selectedSubjectId}
              disabled={!selectedClass}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white disabled:bg-gray-50"
            >
              <option value="">Select Subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Term Select */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Select Exam Term / परीक्षा का प्रकार
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => handleTermChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select Term</option>
              <option value="UNIT_TEST_1">Unit Test 1 (Max: 10)</option>
              <option value="UNIT_TEST_2">Unit Test 2 (Max: 10)</option>
              <option value="HALF_YEARLY">Half-Yearly (Max: 30)</option>
              <option value="ANNUAL">Annual (Max: 50)</option>
            </select>
          </div>
        </div>
      </div>

      {/* STEP 2: Roster Table */}
      {selectedClass && selectedSubjectId && selectedTerm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="border-b border-gray-100 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                Gradesheet: Class {selectedClass} ({subjects.find((s) => s.id === selectedSubjectId)?.name})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Maximum marks limit for {selectedTerm.replace(/_/g, " ")} is{" "}
                <span className="font-bold text-gray-600">{activeMaxLimit} marks</span>.
              </p>
            </div>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded-md">
              No students enrolled in Class {selectedClass}.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-40">Adm No</th>
                      <th className="py-2.5 px-4">Student Name</th>
                      <th className="py-2.5 px-4">Gender</th>
                      <th className="py-2.5 px-4 w-40 text-center">
                        Marks Obtained (Max: {activeMaxLimit})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-gray-600">
                          {s.admissionNo}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-gray-800">
                          {s.fullName}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600 capitalize">
                          {s.gender.toLowerCase()}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={activeMaxLimit}
                              step={0.5}
                              value={marks[s.id] ?? ""}
                              placeholder={`0 - ${activeMaxLimit}`}
                              onChange={(e) => updateMarksValue(s.id, e.target.value)}
                              className="border border-gray-300 rounded px-2.5 py-1 text-sm text-center focus:outline-none w-28"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveMarks}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-green-600 hover:bg-green-700 disabled:opacity-65"
                >
                  {loading && <Loader className="h-4 w-4 animate-spin" />}
                  Save Student Marks / अंक सहेजें
                </button>
                <Link
                  href={`/${locale}/teacher/dashboard`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-sm text-gray-400">
          Select Class, Subject, and Exam Term from the dropdown filter above to load the gradesheet register.
        </div>
      )}
    </div>
  );
}
