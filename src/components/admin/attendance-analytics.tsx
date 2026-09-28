"use client";

import { useState, useMemo } from "react";
import { Search, Percent, BarChart3, Calendar } from "lucide-react";

interface StudentAttendanceData {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  totalDays: number;
  presentDays: number;
}

interface ClassSummaryData {
  className: string;
  sectionName: string;
  totalStudents: number;
  totalDaysMarked: number;
  totalPresent: number;
}

export function AttendanceAnalytics({
  studentData,
  classSummary,
  classNames,
  monthlyStudentData,
  monthlyClassSummary,
}: {
  studentData: StudentAttendanceData[];
  classSummary: ClassSummaryData[];
  classNames: string[];
  monthlyStudentData: StudentAttendanceData[];
  monthlyClassSummary: ClassSummaryData[];
}) {
  const [viewPeriod, setViewPeriod] = useState<"session" | "month">("session");
  const [viewMode, setViewMode] = useState<"class" | "student">("class");
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const activeClassSummary = viewPeriod === "session" ? classSummary : monthlyClassSummary;
  const activeStudentData = viewPeriod === "session" ? studentData : monthlyStudentData;

  const filteredClasses = useMemo(() => {
    return activeClassSummary.filter((c) => !classFilter || c.className === classFilter);
  }, [activeClassSummary, classFilter]);

  const filteredStudents = useMemo(() => {
    return activeStudentData.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || s.className === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [activeStudentData, searchQuery, classFilter]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
        <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
        <h3 className="text-sm font-bold text-gray-800">
          Attendance Analytics / उपस्थिति विश्लेषण
        </h3>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Period Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-sm p-0.5">
          <button
            onClick={() => setViewPeriod("session")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
              viewPeriod === "session" ? "bg-white text-[#6B1D30] shadow-xs" : "text-gray-500"
            }`}
          >
            <Calendar className="h-3 w-3" />
            Session
          </button>
          <button
            onClick={() => setViewPeriod("month")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
              viewPeriod === "month" ? "bg-white text-[#6B1D30] shadow-xs" : "text-gray-500"
            }`}
          >
            <Calendar className="h-3 w-3" />
            This Month
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-sm p-0.5">
          <button
            onClick={() => setViewMode("class")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
              viewMode === "class" ? "bg-white text-[#6B1D30] shadow-xs" : "text-gray-500"
            }`}
          >
            Class-wise
          </button>
          <button
            onClick={() => setViewMode("student")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
              viewMode === "student" ? "bg-white text-[#6B1D30] shadow-xs" : "text-gray-500"
            }`}
          >
            Student-wise
          </button>
        </div>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] min-w-[130px]"
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>Class {cn}</option>
          ))}
        </select>

        {/* Search (student mode) */}
        {viewMode === "student" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or admission no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
            />
          </div>
        )}
      </div>

      {/* Class-wise View */}
      {viewMode === "class" && (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="w-full text-xs min-w-[450px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="text-left py-2.5 px-3">Class & Section</th>
                <th className="text-center py-2.5 px-3">Students</th>
                <th className="text-center py-2.5 px-3">Days Marked</th>
                <th className="text-center py-2.5 px-3">Total Present</th>
                <th className="text-center py-2.5 px-3">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    No attendance data available.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((row, idx) => {
                  const totalPossible = row.totalDaysMarked * row.totalStudents;
                  const pct = totalPossible > 0 ? Math.round((row.totalPresent / totalPossible) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-gray-800">
                        Class {row.className} ({row.sectionName})
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-700">{row.totalStudents}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{row.totalDaysMarked}</td>
                      <td className="py-2.5 px-3 text-center text-green-600 font-semibold">{row.totalPresent}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Student-wise View */}
      {viewMode === "student" && (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="w-full text-xs min-w-[550px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="text-left py-2.5 px-3">#</th>
                <th className="text-left py-2.5 px-3">Student</th>
                <th className="text-left py-2.5 px-3">Adm. No.</th>
                <th className="text-left py-2.5 px-3">Class</th>
                <th className="text-center py-2.5 px-3">Total Days</th>
                <th className="text-center py-2.5 px-3">Present</th>
                <th className="text-center py-2.5 px-3">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No attendance data available.
                  </td>
                </tr>
              ) : (
                filteredStudents.slice(0, 200).map((s, idx) => {
                  const pct = s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 100) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{s.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{s.admissionNo}</td>
                      <td className="py-2.5 px-3 text-gray-600">Class {s.className} ({s.sectionName})</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{s.totalDays}</td>
                      <td className="py-2.5 px-3 text-center text-green-600 font-semibold">{s.presentDays}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredStudents.length > 200 && (
            <p className="px-3 py-2 text-[10px] text-gray-400 border-t border-gray-100">
              Showing first 200 of {filteredStudents.length} results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
