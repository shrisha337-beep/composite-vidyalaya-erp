"use client";

import { useState } from "react";
import {
  FileText,
  Users,
  CalendarCheck,
  BookOpen,
  Download,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";

// Types for data passed from server
export interface ReportsStudentRow {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  fatherName: string | null;
  gender: string;
}

export interface ReportsAttendanceRow {
  className: string;
  sectionName: string;
  totalStudents: number;
  totalDaysMarked: number;
  totalPresent: number;
  percentage: number;
}

export interface ReportsAttendanceStudentRow {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  totalDays: number;
  presentDays: number;
  percentage: number;
}

export interface ReportCardRow {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
}

interface ReportsHubProps {
  locale: string;
  sessionLabel: string;
  totalStudents: number;
  totalTeachers: number;
  students: ReportsStudentRow[];
  classNames: string[];
  attendanceSummary: ReportsAttendanceRow[];
  attendanceStudents: ReportsAttendanceStudentRow[];
  reportCardStudents: ReportCardRow[];
}

// Expandable panel wrapper
function ExpandablePanel({
  title,
  description,
  icon: Icon,
  color,
  externalHref,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  externalHref?: string;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  // If it has an external href, render as a link
  if (externalHref) {
    return (
      <Link
        href={externalHref}
        className="bg-white border border-[#E8E0D4] rounded-sm p-4 sm:p-5 hover:border-[#6B1D30] hover:bg-[#6B1D30]/5 shadow-xs transition-all group block"
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: `${color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#2D2A26] group-hover:text-[#6B1D30] transition-colors">
              {title}
            </h3>
            <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
              {description}
            </p>
          </div>
          <Download className="h-4 w-4 text-[#A89F91] group-hover:text-[#6B1D30] shrink-0 mt-0.5 transition-colors" />
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white border border-[#E8E0D4] rounded-sm shadow-xs transition-all">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 sm:p-5 text-left hover:bg-[#6B1D30]/5 transition-all group"
      >
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: `${color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[#2D2A26] group-hover:text-[#6B1D30] transition-colors">
              {title}
            </h3>
            <p className="text-xs text-[#7A7267] mt-1 leading-relaxed">
              {description}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#A89F91] shrink-0 mt-0.5" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#A89F91] shrink-0 mt-0.5" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-[#E8E0D4]">
          {children}
        </div>
      )}
    </div>
  );
}

// Student List Panel
function StudentListPanel({
  students,
  classNames,
}: {
  students: ReportsStudentRow[];
  classNames: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const filtered = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !classFilter || s.className === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="mt-4 space-y-3">
      {/* Search/Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] min-w-[140px]"
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>Class {cn}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="overflow-x-auto border border-gray-200 rounded-sm">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="bg-[#F8F5F0] border-b border-[#E8E0D4]">
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">#</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Student</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Adm. No.</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Class</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Father&apos;s Name</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Gender</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  {students.length === 0 ? "No students enrolled yet." : "No students match the search criteria."}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((s, idx) => (
                <tr key={s.id} className="hover:bg-[#F3EDE4]/40">
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-[#2D2A26]">{s.fullName}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{s.admissionNo}</td>
                  <td className="px-3 py-2 text-gray-600">{s.className} ({s.sectionName})</td>
                  <td className="px-3 py-2 text-gray-600">{s.fatherName || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{s.gender}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 100 && (
        <p className="text-[10px] text-gray-400">Showing first 100 of {filtered.length} results.</p>
      )}
    </div>
  );
}

// Attendance Summary Panel
function AttendanceSummaryPanel({
  summary,
  studentRows,
  classNames,
}: {
  summary: ReportsAttendanceRow[];
  studentRows: ReportsAttendanceStudentRow[];
  classNames: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [viewMode, setViewMode] = useState<"class" | "student">("class");

  const filteredSummary = summary.filter((s) => {
    return !classFilter || s.className === classFilter;
  });

  const filteredStudents = studentRows.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !classFilter || s.className === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="mt-4 space-y-3">
      {/* Toggle + Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
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
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] min-w-[140px]"
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>Class {cn}</option>
          ))}
        </select>
        {viewMode === "student" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
            />
          </div>
        )}
      </div>

      {/* Class-wise */}
      {viewMode === "class" && (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="bg-[#F8F5F0] border-b border-[#E8E0D4]">
                <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Class</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Students</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Days Marked</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Present</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                    No attendance data available yet.
                  </td>
                </tr>
              ) : (
                filteredSummary.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F3EDE4]/40">
                    <td className="px-3 py-2 font-medium text-[#2D2A26]">Class {row.className} ({row.sectionName})</td>
                    <td className="px-3 py-2 text-center text-gray-600">{row.totalStudents}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{row.totalDaysMarked}</td>
                    <td className="px-3 py-2 text-center text-green-600 font-semibold">{row.totalPresent}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#3D5A80]">{row.percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Student-wise */}
      {viewMode === "student" && (
        <div className="overflow-x-auto border border-gray-200 rounded-sm">
          <table className="w-full text-xs min-w-[500px]">
            <thead>
              <tr className="bg-[#F8F5F0] border-b border-[#E8E0D4]">
                <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">#</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Student</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Adm. No.</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Class</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Total Days</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Present</th>
                <th className="text-center px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No attendance data available yet.
                  </td>
                </tr>
              ) : (
                filteredStudents.slice(0, 100).map((s, idx) => (
                  <tr key={s.id} className="hover:bg-[#F3EDE4]/40">
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-[#2D2A26]">{s.fullName}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{s.admissionNo}</td>
                    <td className="px-3 py-2 text-gray-600">{s.className}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{s.totalDays}</td>
                    <td className="px-3 py-2 text-center text-green-600 font-semibold">{s.presentDays}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#3D5A80]">{s.percentage}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Report Cards Panel
function ReportCardsPanel({
  students,
  classNames,
}: {
  students: ReportCardRow[];
  classNames: string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const filtered = students.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = !classFilter || s.className === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or admission no..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] min-w-[140px]"
        >
          <option value="">All Classes</option>
          {classNames.map((cn) => (
            <option key={cn} value={cn}>Class {cn}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-sm">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="bg-[#F8F5F0] border-b border-[#E8E0D4]">
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">#</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Student</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Adm. No.</th>
              <th className="text-left px-3 py-2 font-semibold text-[#5A534A] uppercase tracking-wider">Class</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                  {students.length === 0 ? "No students enrolled yet." : "No students match the search criteria."}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 100).map((s, idx) => (
                <tr key={s.id} className="hover:bg-[#F3EDE4]/40">
                  <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-[#2D2A26]">{s.fullName}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{s.admissionNo}</td>
                  <td className="px-3 py-2 text-gray-600">{s.className} ({s.sectionName})</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400">
        Report card PDF generation coming soon.
      </p>
    </div>
  );
}

export function ReportsHub({
  locale,
  sessionLabel,
  totalStudents,
  totalTeachers,
  students,
  classNames,
  attendanceSummary,
  attendanceStudents,
  reportCardStudents,
}: ReportsHubProps) {
  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 flex items-center gap-3 shadow-xs">
          <Users className="h-5 w-5 text-[#6B1D30]" />
          <div>
            <p className="text-xl sm:text-2xl font-bold text-[#2D2A26]">{totalStudents}</p>
            <p className="text-xs text-[#7A7267]">Active Students</p>
          </div>
        </div>
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 flex items-center gap-3 shadow-xs">
          <Users className="h-5 w-5 text-[#3D5A80]" />
          <div>
            <p className="text-xl sm:text-2xl font-bold text-[#2D2A26]">{totalTeachers}</p>
            <p className="text-xs text-[#7A7267]">Staff Members</p>
          </div>
        </div>
      </div>

      {/* Report Panels */}
      <div className="grid grid-cols-1 gap-4">
        {/* Student List — expandable */}
        <ExpandablePanel
          title="Student List"
          description="View complete student list by class/section."
          icon={Users}
          color="#7c2d12"
        >
          <StudentListPanel students={students} classNames={classNames} />
        </ExpandablePanel>

        {/* Attendance Summary — expandable */}
        <ExpandablePanel
          title="Attendance Summary"
          description="Session-wise attendance report — class-wise and student-wise."
          icon={CalendarCheck}
          color="#15803d"
        >
          <AttendanceSummaryPanel
            summary={attendanceSummary}
            studentRows={attendanceStudents}
            classNames={classNames}
          />
        </ExpandablePanel>

        {/* Marks / Results — links to existing page */}
        <ExpandablePanel
          title="Marks / Results"
          description="Exam-wise marks summary with totals, percentages, and ranks."
          icon={BookOpen}
          color="#1d4ed8"
          externalHref={`/${locale}/admin/marks`}
        />

        {/* Report Cards — expandable */}
        <ExpandablePanel
          title="Report Cards"
          description="Generate and download student report cards as PDF for any session."
          icon={FileText}
          color="#3D5A80"
        >
          <ReportCardsPanel students={reportCardStudents} classNames={classNames} />
        </ExpandablePanel>

        {/* Transfer Certificate — links to existing page */}
        <ExpandablePanel
          title="Transfer Certificate / स्थानांतरण प्रमाण पत्र"
          description="View all issued TCs. Search by class, student name, or admission number."
          icon={ArrowRightLeft}
          color="#b91c1c"
          externalHref={`/${locale}/admin/reports/tc`}
        />
      </div>
    </div>
  );
}
