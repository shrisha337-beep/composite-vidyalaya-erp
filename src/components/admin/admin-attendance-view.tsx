"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDailyAttendanceAction } from "@/app/actions/save-attendance";
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  Percent,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface ClassAttendanceSummary {
  sectionId: string;
  className: string;
  sectionName: string;
  classTeacherName: string | null;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  boysCount?: number;
  boysPresent?: number;
  girlsCount?: number;
  girlsPresent?: number;
  isMarked: boolean;
  students: {
    id: string;
    fullName: string;
    admissionNo: string;
    gender?: string;
    status: "PRESENT" | "ABSENT";
  }[];
}

export function AdminAttendanceView({
  locale,
  selectedDate,
  classesSummary,
}: {
  locale: string;
  selectedDate: string;
  classesSummary: ClassAttendanceSummary[];
}) {
  const router = useRouter();

  const [date, setDate] = useState(selectedDate);
  const [activeSection, setActiveSection] = useState<ClassAttendanceSummary | null>(null);
  const [rosterStatusMap, setRosterStatusMap] = useState<Record<string, "PRESENT" | "ABSENT">>({});
  const [rosterGenderFilter, setRosterGenderFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Aggregate stats
  const totalEnrolled = classesSummary.reduce((acc, c) => acc + c.totalStudents, 0);
  const totalPresent = classesSummary.reduce((acc, c) => acc + c.presentCount, 0);
  const totalAbsent = classesSummary.reduce((acc, c) => acc + c.absentCount, 0);
  const overallRate = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;
  const classesMarkedCount = classesSummary.filter((c) => c.isMarked).length;

  const totalBoys = classesSummary.reduce((acc, c) => acc + (c.boysCount ?? 0), 0);
  const totalBoysPresent = classesSummary.reduce((acc, c) => acc + (c.boysPresent ?? 0), 0);
  const boysRate = totalBoys > 0 ? Math.round((totalBoysPresent / totalBoys) * 100) : 0;

  const totalGirls = classesSummary.reduce((acc, c) => acc + (c.girlsCount ?? 0), 0);
  const totalGirlsPresent = classesSummary.reduce((acc, c) => acc + (c.girlsPresent ?? 0), 0);
  const girlsRate = totalGirls > 0 ? Math.round((totalGirlsPresent / totalGirls) * 100) : 0;

  function handleDateChange(newDate: string) {
    setDate(newDate);
    router.push(`/${locale}/admin/attendance?date=${newDate}`);
  }

  function openRosterInspector(c: ClassAttendanceSummary) {
    setActiveSection(c);
    const initialMap: Record<string, "PRESENT" | "ABSENT"> = {};
    c.students.forEach((s) => {
      initialMap[s.id] = s.status;
    });
    setRosterStatusMap(initialMap);
    setSuccessMsg("");
    setErrorMsg("");
  }

  function toggleStudentStatus(studentId: string) {
    setRosterStatusMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "PRESENT" ? "ABSENT" : "PRESENT",
    }));
  }

  async function handleSaveRosterOverride() {
    if (!activeSection) return;
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const records = Object.entries(rosterStatusMap).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    try {
      const res = await saveDailyAttendanceAction({
        attendanceRecords: records,
        dateString: date,
        sectionId: activeSection.sectionId,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to save attendance override.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Header Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
            Attendance Register Date / तिथि चयन
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Inspecting school-wide daily attendance logs for {new Date(date).toLocaleDateString("en-IN", { dateStyle: "full" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium">Select Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Overview Stat Cards with Gender Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Total Enrolled */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Enrolled / कुल</p>
            <p className="text-base font-bold text-gray-800">{totalEnrolled}</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-green-50 text-green-600 shrink-0">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Present / उपस्थित</p>
            <p className="text-base font-bold text-green-700">{totalPresent}</p>
          </div>
        </div>

        {/* Boys Present */}
        <div className="bg-white border border-blue-100 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs shrink-0">
            👦
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Boys / बालक</p>
            <p className="text-base font-bold text-blue-800">
              {totalBoysPresent}<span className="text-xs text-gray-400 font-normal">/{totalBoys}</span>{" "}
              <span className="text-xs font-semibold text-blue-600">({boysRate}%)</span>
            </p>
          </div>
        </div>

        {/* Girls Present */}
        <div className="bg-white border border-rose-100 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs shrink-0">
            👧
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Girls / बालिका</p>
            <p className="text-base font-bold text-rose-800">
              {totalGirlsPresent}<span className="text-xs text-gray-400 font-normal">/{totalGirls}</span>{" "}
              <span className="text-xs font-semibold text-rose-600">({girlsRate}%)</span>
            </p>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-50 text-red-600 shrink-0">
            <UserX className="h-4 w-4" />
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Absent / अनुपस्थित</p>
            <p className="text-base font-bold text-red-700">{totalAbsent}</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#3D5A80]/10 text-[#3D5A80] shrink-0">
            <Percent className="h-4 w-4" />
          </div>
          <div>
            <p className="text-gray-400 font-medium text-[11px]">Rate / प्रतिशत</p>
            <p className="text-base font-bold text-[#3D5A80]">{overallRate}%</p>
          </div>
        </div>
      </div>

      {/* Class-by-Class Attendance Matrix */}
      <div className="bg-white border border-gray-200 rounded-sm p-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-gray-800">
            Class Register Status / कक्षावार उपस्थिति रजिस्टर ({classesMarkedCount}/{classesSummary.length} Marked)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Class & Section</th>
                <th className="py-3 px-3">Class Teacher</th>
                <th className="py-3 px-3 text-center">Boys / बालक</th>
                <th className="py-3 px-3 text-center">Girls / बालिका</th>
                <th className="py-3 px-3 text-center">Total Present</th>
                <th className="py-3 px-3 text-center">Rate</th>
                <th className="py-3 px-3 text-center">Register Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {classesSummary.map((c) => {
                const classRate =
                  c.totalStudents > 0 ? Math.round((c.presentCount / c.totalStudents) * 100) : 0;
                const bCount = c.boysCount ?? 0;
                const bPres = c.boysPresent ?? 0;
                const bPct = bCount > 0 ? Math.round((bPres / bCount) * 100) : 0;

                const gCount = c.girlsCount ?? 0;
                const gPres = c.girlsPresent ?? 0;
                const gPct = gCount > 0 ? Math.round((gPres / gCount) * 100) : 0;

                return (
                  <tr key={c.sectionId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900">
                      Class {c.className} ({c.sectionName})
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-600">
                      {c.classTeacherName || <span className="text-gray-400 italic">Not Assigned</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-blue-800">
                        {bPres}/{bCount}
                      </span>{" "}
                      <span className="text-[11px] font-bold text-blue-600">({bPct}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-semibold text-rose-800">
                        {gPres}/{gCount}
                      </span>{" "}
                      <span className="text-[11px] font-bold text-rose-600">({gPct}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-800">
                      {c.presentCount}/{c.totalStudents}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-[#3D5A80]">{classRate}%</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={[
                          "px-2.5 py-0.5 rounded-sm font-bold text-[10px] inline-flex items-center gap-1",
                          c.isMarked
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-yellow-50 text-yellow-700 border border-yellow-200",
                        ].join(" ")}
                      >
                        {c.isMarked ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" /> MARKED
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" /> PENDING
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openRosterInspector(c)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded text-[11px] transition-colors inline-flex items-center gap-1"
                      >
                        Inspect / Override
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster Inspection & Override Modal */}
      {activeSection && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-gray-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Class {activeSection.className} ({activeSection.sectionName}) Roster Inspection
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Date: {date} · Class Teacher: {activeSection.classTeacherName || "Unassigned"}
                </p>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                <p className="text-gray-500 font-medium">
                  Click any student row or button to toggle their Present / Absent status.
                </p>
                {/* Gender filter tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-sm">
                  <button
                    type="button"
                    onClick={() => setRosterGenderFilter("")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                      !rosterGenderFilter ? "bg-white text-gray-800 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    All ({activeSection.students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterGenderFilter("MALE")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                      rosterGenderFilter === "MALE" ? "bg-blue-600 text-white shadow-xs" : "text-blue-700 hover:text-blue-900"
                    }`}
                  >
                    👦 Boys ({activeSection.students.filter((s) => s.gender === "MALE").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterGenderFilter("FEMALE")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                      rosterGenderFilter === "FEMALE" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:text-rose-900"
                    }`}
                  >
                    👧 Girls ({activeSection.students.filter((s) => s.gender === "FEMALE").length})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {activeSection.students
                  .filter((s) => !rosterGenderFilter || s.gender === rosterGenderFilter)
                  .map((s, idx) => {
                    const currentStatus = rosterStatusMap[s.id] ?? s.status;
                    const isPresent = currentStatus === "PRESENT";

                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleStudentStatus(s.id)}
                        className="p-3 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-gray-400 text-[11px] font-mono text-right">
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="font-bold text-gray-800">{s.fullName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">SR: {s.admissionNo}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-xs ${
                                  s.gender === "FEMALE"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {s.gender === "FEMALE" ? "👧 बालिका" : "👦 बालक"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleStudentStatus(s.id)}
                            className={[
                              "px-3 py-1 rounded font-bold text-xs flex items-center gap-1 transition-colors",
                              isPresent
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white",
                            ].join(" ")}
                          >
                            {isPresent ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> PRESENT
                              </>
                            ) : (
                              <>
                                <X className="h-3.5 w-3.5" /> ABSENT
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between">
              <button
                onClick={() => setActiveSection(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded text-xs hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleSaveRosterOverride}
                disabled={loading}
                className="px-5 py-2 bg-[hsl(var(--primary))] hover:opacity-90 text-white font-semibold rounded text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Override Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
