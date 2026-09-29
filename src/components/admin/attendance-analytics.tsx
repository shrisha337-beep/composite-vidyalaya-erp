"use client";

import { useState, useMemo } from "react";
import { Search, BarChart3, Calendar, Users } from "lucide-react";

export interface StudentAttendanceData {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  totalDays: number;
  presentDays: number;
  gender?: string;
  dayStatus?: string;
}

export interface ClassSummaryData {
  className: string;
  sectionName: string;
  totalStudents: number;
  totalDaysMarked: number;
  totalPresent: number;
  boysCount?: number;
  boysPresent?: number;
  girlsCount?: number;
  girlsPresent?: number;
}

export function AttendanceAnalytics({
  studentData,
  classSummary,
  classNames,
  monthlyStudentData,
  monthlyClassSummary,
  dailyStudentData,
  dailyClassSummary,
  selectedDate,
}: {
  studentData: StudentAttendanceData[];
  classSummary: ClassSummaryData[];
  classNames: string[];
  monthlyStudentData: StudentAttendanceData[];
  monthlyClassSummary: ClassSummaryData[];
  dailyStudentData?: StudentAttendanceData[];
  dailyClassSummary?: ClassSummaryData[];
  selectedDate?: string;
}) {
  const [viewPeriod, setViewPeriod] = useState<"day" | "month" | "session">(
    dailyClassSummary && dailyClassSummary.length > 0 ? "day" : "month"
  );
  const [viewMode, setViewMode] = useState<"class" | "student">("class");
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | "MALE" | "FEMALE">("");

  // Select active data according to chosen period
  const activeClassSummary = useMemo(() => {
    if (viewPeriod === "day") return dailyClassSummary ?? [];
    if (viewPeriod === "month") return monthlyClassSummary;
    return classSummary;
  }, [viewPeriod, dailyClassSummary, monthlyClassSummary, classSummary]);

  const activeStudentData = useMemo(() => {
    if (viewPeriod === "day") return dailyStudentData ?? [];
    if (viewPeriod === "month") return monthlyStudentData;
    return studentData;
  }, [viewPeriod, dailyStudentData, monthlyStudentData, studentData]);

  // Filtered classes by class dropdown
  const filteredClasses = useMemo(() => {
    return activeClassSummary.filter((c) => !classFilter || c.className === classFilter);
  }, [activeClassSummary, classFilter]);

  // Filtered students by class, gender, and search text
  const filteredStudents = useMemo(() => {
    return activeStudentData.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = !classFilter || s.className === classFilter;
      const matchesGender = !genderFilter || s.gender === genderFilter;
      return matchesSearch && matchesClass && matchesGender;
    });
  }, [activeStudentData, searchQuery, classFilter, genderFilter]);

  // Overall Gender Aggregates for Top Cards
  const isDay = viewPeriod === "day";

  const totalBoysCount = useMemo(() => {
    return filteredClasses.reduce((acc, c) => acc + (c.boysCount || 0), 0);
  }, [filteredClasses]);

  const totalBoysPresent = useMemo(() => {
    return filteredClasses.reduce((acc, c) => acc + (c.boysPresent || 0), 0);
  }, [filteredClasses]);

  const totalBoysPossible = useMemo(() => {
    if (isDay) return totalBoysCount;
    return filteredClasses.reduce(
      (acc, c) => acc + (c.totalDaysMarked || 0) * (c.boysCount || 0),
      0
    );
  }, [isDay, filteredClasses, totalBoysCount]);

  const boysRate =
    totalBoysPossible > 0 ? Math.round((totalBoysPresent / totalBoysPossible) * 100) : 0;

  const totalGirlsCount = useMemo(() => {
    return filteredClasses.reduce((acc, c) => acc + (c.girlsCount || 0), 0);
  }, [filteredClasses]);

  const totalGirlsPresent = useMemo(() => {
    return filteredClasses.reduce((acc, c) => acc + (c.girlsPresent || 0), 0);
  }, [filteredClasses]);

  const totalGirlsPossible = useMemo(() => {
    if (isDay) return totalGirlsCount;
    return filteredClasses.reduce(
      (acc, c) => acc + (c.totalDaysMarked || 0) * (c.girlsCount || 0),
      0
    );
  }, [isDay, filteredClasses, totalGirlsCount]);

  const girlsRate =
    totalGirlsPossible > 0 ? Math.round((totalGirlsPresent / totalGirlsPossible) * 100) : 0;

  const grandTotalPresent = totalBoysPresent + totalGirlsPresent;
  const grandTotalPossible = totalBoysPossible + totalGirlsPossible;
  const grandRate =
    grandTotalPossible > 0 ? Math.round((grandTotalPresent / grandTotalPossible) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
          <h3 className="text-sm font-bold text-gray-800">
            Attendance Analytics & Gender Breakdown / उपस्थिति एवं लिंग-वार विश्लेषण
          </h3>
        </div>
        {selectedDate && viewPeriod === "day" && (
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            दिनांक / Date: {selectedDate}
          </span>
        )}
      </div>

      {/* Top Gender Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Boys Card */}
        <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <span className="text-sm">👦</span>
              <span>Boys / बालक</span>
            </div>
            <div className="text-xl font-bold text-blue-700 mt-1">
              {totalBoysPresent}{" "}
              <span className="text-xs text-blue-500 font-normal">
                / {totalBoysPossible} {isDay ? "enrolled" : "possible"}
              </span>
            </div>
            <div className="text-[11px] text-blue-600 mt-0.5 font-medium">
              उपस्थिति दर: <strong className="font-bold">{boysRate}%</strong>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
            {boysRate}%
          </div>
        </div>

        {/* Girls Card */}
        <div className="bg-pink-50/50 border border-pink-200 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-900">
              <span className="text-sm">👧</span>
              <span>Girls / बालिका</span>
            </div>
            <div className="text-xl font-bold text-pink-700 mt-1">
              {totalGirlsPresent}{" "}
              <span className="text-xs text-pink-500 font-normal">
                / {totalGirlsPossible} {isDay ? "enrolled" : "possible"}
              </span>
            </div>
            <div className="text-[11px] text-pink-600 mt-0.5 font-medium">
              उपस्थिति दर: <strong className="font-bold">{girlsRate}%</strong>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-700 font-bold text-xs">
            {girlsRate}%
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Users className="h-3.5 w-3.5 text-emerald-700" />
              <span>Total / कुल</span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {grandTotalPresent}{" "}
              <span className="text-xs text-emerald-500 font-normal">
                / {grandTotalPossible} {isDay ? "enrolled" : "possible"}
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">
              कुल उपस्थिति दर: <strong className="font-bold">{grandRate}%</strong>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
            {grandRate}%
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-2.5 mb-4">
        {/* Period Toggle (Day / Month / Session) */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-sm p-0.5 self-start">
          {dailyClassSummary && (
            <button
              type="button"
              onClick={() => setViewPeriod("day")}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
                viewPeriod === "day"
                  ? "bg-white text-[#6B1D30] shadow-xs"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="h-3 w-3" />
              Day-wise / दैनिक
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewPeriod("month")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
              viewPeriod === "month"
                ? "bg-white text-[#6B1D30] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calendar className="h-3 w-3" />
            This Month / इस माह
          </button>
          <button
            type="button"
            onClick={() => setViewPeriod("session")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
              viewPeriod === "session"
                ? "bg-white text-[#6B1D30] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calendar className="h-3 w-3" />
            Session / पूरा सत्र
          </button>
        </div>

        {/* View Mode Toggle (Class-wise / Student-wise) */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-sm p-0.5 self-start">
          <button
            type="button"
            onClick={() => setViewMode("class")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
              viewMode === "class"
                ? "bg-white text-[#6B1D30] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Class-wise / कक्षा-वार
          </button>
          <button
            type="button"
            onClick={() => setViewMode("student")}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-sm transition-colors ${
              viewMode === "student"
                ? "bg-white text-[#6B1D30] shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Student-wise / छात्र-वार
          </button>
        </div>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] min-w-[130px]"
        >
          <option value="">All Classes / सभी कक्षाएं</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>
              Class {cn}
            </option>
          ))}
        </select>

        {/* Student View Specific Controls: Gender Filter & Search */}
        {viewMode === "student" && (
          <div className="flex flex-col sm:flex-row flex-1 gap-2">
            {/* Gender Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-sm p-0.5 self-start">
              <button
                type="button"
                onClick={() => setGenderFilter("")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors ${
                  genderFilter === ""
                    ? "bg-white text-gray-800 shadow-xs"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All / सभी
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter("MALE")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
                  genderFilter === "MALE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-700 hover:bg-blue-50"
                }`}
              >
                👦 Boys / बालक
              </button>
              <button
                type="button"
                onClick={() => setGenderFilter("FEMALE")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm transition-colors flex items-center gap-1 ${
                  genderFilter === "FEMALE"
                    ? "bg-pink-600 text-white shadow-xs"
                    : "text-pink-700 hover:bg-pink-50"
                }`}
              >
                👧 Girls / बालिका
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student name or admission no..."
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Class-wise View */}
      {viewMode === "class" && (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="text-left py-2.5 px-3">Class & Section / कक्षा</th>
                <th className="text-center py-2.5 px-3">
                  <span className="text-blue-700">👦 Boys / बालक</span>
                  <span className="block text-[10px] font-normal text-gray-500">
                    (Present / Total, %)
                  </span>
                </th>
                <th className="text-center py-2.5 px-3">
                  <span className="text-pink-700">👧 Girls / बालिका</span>
                  <span className="block text-[10px] font-normal text-gray-500">
                    (Present / Total, %)
                  </span>
                </th>
                <th className="text-center py-2.5 px-3">
                  Total Present / उपस्थित
                  <span className="block text-[10px] font-normal text-gray-500">
                    {isDay ? "Today" : "Across Days"}
                  </span>
                </th>
                <th className="text-center py-2.5 px-3">Attendance % / दर</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    No attendance data available for this selection.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((row, idx) => {
                  const boysTotal = isDay
                    ? row.boysCount || 0
                    : (row.totalDaysMarked || 0) * (row.boysCount || 0);
                  const boysP = row.boysPresent || 0;
                  const boysPct = boysTotal > 0 ? Math.round((boysP / boysTotal) * 100) : 0;

                  const girlsTotal = isDay
                    ? row.girlsCount || 0
                    : (row.totalDaysMarked || 0) * (row.girlsCount || 0);
                  const girlsP = row.girlsPresent || 0;
                  const girlsPct = girlsTotal > 0 ? Math.round((girlsP / girlsTotal) * 100) : 0;

                  const totalPossible = isDay
                    ? row.totalStudents
                    : row.totalDaysMarked * row.totalStudents;
                  const pct =
                    totalPossible > 0 ? Math.round((row.totalPresent / totalPossible) * 100) : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-gray-800">
                        Class {row.className} ({row.sectionName})
                        <span className="block text-[10px] font-normal text-gray-500">
                          Total Enrolled: {row.totalStudents}
                          {!isDay && ` • Days Marked: ${row.totalDaysMarked}`}
                        </span>
                      </td>

                      {/* Boys Col */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="font-semibold text-blue-700">
                          {boysP}{" "}
                          <span className="text-[10px] text-gray-400">/ {boysTotal}</span>
                        </div>
                        <div className="text-[10px] text-blue-600 font-bold">{boysPct}%</div>
                      </td>

                      {/* Girls Col */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="font-semibold text-pink-700">
                          {girlsP}{" "}
                          <span className="text-[10px] text-gray-400">/ {girlsTotal}</span>
                        </div>
                        <div className="text-[10px] text-pink-600 font-bold">{girlsPct}%</div>
                      </td>

                      {/* Total Present Col */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-gray-800">{row.totalPresent}</span>
                        <span className="text-[10px] text-gray-400 block">
                          / {totalPossible}
                        </span>
                      </td>

                      {/* Overall % Col */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-bold ${
                            pct >= 75
                              ? "text-green-600"
                              : pct >= 50
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
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
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="text-left py-2.5 px-3">#</th>
                <th className="text-left py-2.5 px-3">Student / छात्र</th>
                <th className="text-left py-2.5 px-3">Adm. No. / प्रवेश सं.</th>
                <th className="text-left py-2.5 px-3">Class / कक्षा</th>
                <th className="text-center py-2.5 px-3">Gender / लिंग</th>
                {isDay ? (
                  <th className="text-center py-2.5 px-3">Status / स्थिति</th>
                ) : (
                  <>
                    <th className="text-center py-2.5 px-3">Total Days / दिन</th>
                    <th className="text-center py-2.5 px-3">Present / उपस्थित</th>
                    <th className="text-center py-2.5 px-3">% / दर</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={isDay ? 6 : 8}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    No students match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.slice(0, 200).map((s, idx) => {
                  const pct =
                    s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 100) : 0;
                  const isBoy = s.gender === "MALE";
                  const isGirl = s.gender === "FEMALE";

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-800">{s.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{s.admissionNo}</td>
                      <td className="py-2.5 px-3 text-gray-600">
                        Class {s.className} ({s.sectionName})
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isBoy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            👦 बालक
                          </span>
                        ) : isGirl ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                            👧 बालिका
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                            {s.gender || "-"}
                          </span>
                        )}
                      </td>

                      {/* Day View vs Multi-day View */}
                      {isDay ? (
                        <td className="py-2.5 px-3 text-center">
                          {s.dayStatus === "PRESENT" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                              उपस्थित / Present
                            </span>
                          ) : s.dayStatus === "ABSENT" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                              अनुपस्थित / Absent
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                              Not Marked
                            </span>
                          )}
                        </td>
                      ) : (
                        <>
                          <td className="py-2.5 px-3 text-center text-gray-600">
                            {s.totalDays}
                          </td>
                          <td className="py-2.5 px-3 text-center text-green-600 font-semibold">
                            {s.presentDays}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-bold ${
                                pct >= 75
                                  ? "text-green-600"
                                  : pct >= 50
                                  ? "text-amber-600"
                                  : "text-red-600"
                              }`}
                            >
                              {pct}%
                            </span>
                          </td>
                        </>
                      )}
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
