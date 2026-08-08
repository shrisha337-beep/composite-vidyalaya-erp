"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDailyAttendanceAction } from "@/app/actions/save-attendance";
import { Calendar, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import Link from "next/link";

interface StudentRow {
  id: string;
  admissionNo: string;
  fullName: string;
  gender: string;
  currentStatus?: string | null;
}

export function AttendanceView({
  locale,
  sectionId,
  className,
  sectionName,
  dateString,
  students,
}: {
  locale: string;
  sectionId: string;
  className: string;
  sectionName: string;
  dateString: string;
  students: StudentRow[];
}) {
  const router = useRouter();

  type StatusesState = Record<string, "PRESENT" | "ABSENT">;

  // State to hold attendance status (defaults to PRESENT or existing status)
  const [statuses, setStatuses] = useState<StatusesState>(() => {
    const initial: StatusesState = {};
    students.forEach((s) => {
      initial[s.id] = s.currentStatus === "ABSENT" ? "ABSENT" : "PRESENT";
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleDateChange(val: string) {
    router.push(`/${locale}/teacher/attendance?date=${val}`);
  }

  function toggleAttendance(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "PRESENT" ? "ABSENT" : "PRESENT",
    }));
  }

  function setAllStatus(status: "PRESENT" | "ABSENT") {
    setStatuses((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = status;
      });
      return updated;
    });
  }

  async function handleSaveAttendance() {
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    const records = students.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] || "PRESENT",
    }));

    try {
      const res = await saveDailyAttendanceAction({
        attendanceRecords: records,
        dateString,
        sectionId,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while saving attendance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
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

      {/* Date Selector & Bulk Actions Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">
              Attendance Date / उपस्थिति दिनांक
            </label>
            <input
              type="date"
              value={dateString}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAllStatus("PRESENT")}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white"
          >
            Mark All Present / सभी उपस्थित
          </button>
          <button
            type="button"
            onClick={() => setAllStatus("ABSENT")}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white"
          >
            Mark All Absent / सभी अनुपस्थित
          </button>
        </div>
      </div>

      {/* Student List Checklist */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="border-b border-gray-100 pb-3 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Class {className} (Section {sectionName}) Register
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select student status by toggling below. Green is present, gray is absent.
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center border border-dashed border-gray-200 rounded-md">
            No active students enrolled in this class.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1.5fr_1fr_auto] gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-50 pb-1.5">
              <span>Student Details</span>
              <span className="text-center">Gender</span>
              <span className="w-36 text-center">Status / उपस्थिति</span>
            </div>

            {students.map((s) => {
              const status = statuses[s.id] || "PRESENT";
              const isPresent = status === "PRESENT";
              return (
                <div
                  key={s.id}
                  className="grid grid-cols-[1.5fr_1fr_auto] gap-4 items-center py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.fullName}</p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">SR No: {s.admissionNo}</p>
                  </div>
                  <td className="text-gray-500 text-xs capitalize text-center">
                    {s.gender.toLowerCase()}
                  </td>
                  <div className="w-36 flex items-center justify-center">
                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => toggleAttendance(s.id)}
                      className={[
                        "relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        isPresent ? "bg-green-600" : "bg-gray-300",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isPresent ? "translate-x-6" : "translate-x-0",
                        ].join(" ")}
                      />
                    </button>
                    <span
                      className={[
                        "text-xs font-bold w-16 text-center ml-2.5",
                        isPresent ? "text-green-700" : "text-gray-500",
                      ].join(" ")}
                    >
                      {isPresent ? "Present" : "Absent"}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-100 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-md text-sm font-medium text-white transition-colors bg-green-600 hover:bg-green-700 disabled:opacity-65"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                Save Attendance / उपस्थिति सहेजें
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
    </div>
  );
}
