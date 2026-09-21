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
    <div className="space-y-4 sm:space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-sm text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Date Selector & Bulk Actions Header */}
      <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#6B1D30] shrink-0" />
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#7A7267] mb-1">
              Attendance Date / उपस्थिति दिनांक
            </label>
            <input
              type="date"
              value={dateString}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full sm:w-auto border border-[#D5CCC1] rounded-sm px-3 py-1.5 text-xs font-semibold text-[#2D2A26] bg-[#FAF8F5] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setAllStatus("PRESENT")}
            className="px-3 py-2 border border-emerald-300 rounded-sm text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            All Present / सभी उपस्थित
          </button>
          <button
            type="button"
            onClick={() => setAllStatus("ABSENT")}
            className="px-3 py-2 border border-red-300 rounded-sm text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 transition-colors"
          >
            All Absent / सभी अनुपस्थित
          </button>
        </div>
      </div>

      {/* Student List Checklist */}
      <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 sm:p-5 shadow-xs">
        <div className="border-b border-[#E8E0D4] pb-3 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#2D2A26]">
              Class {className} (Section {sectionName}) Register
            </h3>
            <p className="text-xs text-[#7A7267] mt-0.5">
              Tap the status button to toggle Present / Absent. Green indicates present, red indicates absent.
            </p>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-[#7A7267] py-10 text-center border border-dashed border-[#E8E0D4] rounded-sm">
            No active students enrolled in this class.
          </p>
        ) : (
          <div className="space-y-1">
            {students.map((s, idx) => {
              const status = statuses[s.id] || "PRESENT";
              const isPresent = status === "PRESENT";
              return (
                <div
                  key={s.id}
                  onClick={() => toggleAttendance(s.id)}
                  className="flex items-center justify-between py-3 px-2 sm:px-3 border-b border-[#E8E0D4]/70 last:border-0 hover:bg-[#F3EDE4]/40 cursor-pointer rounded-sm transition-colors gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-xs font-mono text-[#A89F91] w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#2D2A26] truncate">
                        {s.fullName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#7A7267] mt-0.5">
                        <span className="font-mono">SR: {s.admissionNo}</span>
                        <span>•</span>
                        <span className="capitalize">{s.gender.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(s.id)}
                      className={[
                        "px-3.5 py-1.5 rounded-sm text-xs font-bold transition-all shadow-2xs",
                        isPresent
                          ? "bg-emerald-700 text-white hover:bg-emerald-800"
                          : "bg-red-700 text-white hover:bg-red-800",
                      ].join(" ")}
                    >
                      {isPresent ? "Present (P)" : "Absent (A)"}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Save Button */}
            <div className="pt-6 border-t border-[#E8E0D4] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-sm text-sm font-bold text-white transition-colors bg-[#6B1D30] hover:bg-[#541624] disabled:opacity-65 shadow-xs"
              >
                {loading && <Loader className="h-4 w-4 animate-spin" />}
                <span>Save Attendance / उपस्थिति सहेजें</span>
              </button>
              <Link
                href={`/${locale}/teacher/dashboard`}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 border border-[#D5CCC1] rounded-sm text-xs font-semibold text-[#5A534A] hover:bg-[#F3EDE4] transition-colors"
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
