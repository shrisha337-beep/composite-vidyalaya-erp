"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Utensils,
  Apple,
  Wheat,
  CheckSquare,
  Square,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Printer,
  CalendarDays,
  IndianRupee,
  School,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveMDMFruitLogAction, type StudentFruitEntry } from "@/app/actions/save-mdm";

export interface StudentItem {
  id: string;
  fullName: string;
  admissionNo: string;
  gender: string;
  didEatFruit: boolean;
}

export interface ClassSectionMDM {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  totalStudents: number;
  presentStudents: StudentItem[];
}

export interface MonthlyDayLog {
  dateStr: string;
  dayOfWeek: string;
  totalPresent: number;
  wheatGrams: number;
  riceGrams: number;
  fruitsEaten: number;
  fruitCost: number;
  conversionCost: number;
  hasAttendance: boolean;
}

interface MdmDashboardViewProps {
  selectedDateStr: string;
  selectedMonthStr: string;
  locale: string;
  classesData: ClassSectionMDM[];
  primaryMonthlyLogs: MonthlyDayLog[];
  juniorMonthlyLogs: MonthlyDayLog[];
  conversionCostPrimary: number;
  conversionCostJunior: number;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PRIMARY_CLASSES = ["1", "2", "3", "4", "5"];
const GRAIN_PER_STUDENT_PRIMARY = 100; // grams
const GRAIN_PER_STUDENT_JUNIOR = 150; // grams
const FRUIT_COST_PER_STUDENT = 4; // ₹

function isPrimaryClass(className: string): boolean {
  return PRIMARY_CLASSES.includes(className);
}

export function MdmDashboardView({
  selectedDateStr,
  selectedMonthStr,
  locale,
  classesData,
  primaryMonthlyLogs,
  juniorMonthlyLogs,
  conversionCostPrimary: CONVERSION_COST_PRIMARY,
  conversionCostJunior: CONVERSION_COST_JUNIOR,
}: MdmDashboardViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [schoolLevel, setSchoolLevel] = useState<"primary" | "junior">("primary");
  const [dateInput, setDateInput] = useState(selectedDateStr);
  const [monthInput, setMonthInput] = useState(selectedMonthStr);

  // Local fruit attendance state: studentId -> boolean
  const initialFruitState: Record<string, boolean> = {};
  classesData.forEach((c) => {
    c.presentStudents.forEach((s) => {
      initialFruitState[s.id] = s.didEatFruit;
    });
  });
  const [fruitState, setFruitState] = useState<Record<string, boolean>>(initialFruitState);

  // Modal state for student fruit checklist
  const [selectedClassForChecklist, setSelectedClassForChecklist] = useState<ClassSectionMDM | null>(null);

  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Navigate to new date
  function handleDateChange(newDate: string) {
    setDateInput(newDate);
    router.push(`/${locale}/admin/mdm?date=${newDate}&month=${monthInput}`);
  }

  // Navigate to new month
  function handleMonthChange(newMonth: string) {
    setMonthInput(newMonth);
    router.push(`/${locale}/admin/mdm?date=${dateInput}&month=${newMonth}`);
  }

  // Toggle single student fruit
  function toggleStudentFruit(studentId: string) {
    setFruitState((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === false ? true : false,
    }));
  }

  // Bulk toggle for current class modal
  function toggleAllInClass(students: StudentItem[], value: boolean) {
    setFruitState((prev) => {
      const next = { ...prev };
      students.forEach((s) => {
        next[s.id] = value;
      });
      return next;
    });
  }

  // Save fruit attendance for the day
  async function handleSaveFruitAttendance() {
    setSaveMessage(null);
    startTransition(async () => {
      // Gather all present students and their state
      const entries: StudentFruitEntry[] = [];
      classesData.forEach((c) => {
        c.presentStudents.forEach((s) => {
          entries.push({
            studentId: s.id,
            didEat: fruitState[s.id] !== false,
          });
        });
      });

      const res = await saveMDMFruitLogAction({
        dateString: selectedDateStr,
        fruitEntries: entries,
        locale,
      });

      if (res.success) {
        setSaveMessage({ type: "success", text: res.message });
        setTimeout(() => setSaveMessage(null), 4000);
        setSelectedClassForChecklist(null);
      } else {
        setSaveMessage({ type: "error", text: res.message });
      }
    });
  }

  // ─── Split classes by school level ──────────────────────────────────────────
  const primaryClasses = classesData.filter((c) => isPrimaryClass(c.className));
  const juniorClasses = classesData.filter((c) => !isPrimaryClass(c.className));

  const currentClasses = schoolLevel === "primary" ? primaryClasses : juniorClasses;
  const grainPerStudent = schoolLevel === "primary" ? GRAIN_PER_STUDENT_PRIMARY : GRAIN_PER_STUDENT_JUNIOR;
  const conversionCostPerStudent = schoolLevel === "primary" ? CONVERSION_COST_PRIMARY : CONVERSION_COST_JUNIOR;
  const currentMonthlyLogs = schoolLevel === "primary" ? primaryMonthlyLogs : juniorMonthlyLogs;

  // ─── Calculate daily totals for current school level ────────────────────────
  let totalEnrolled = 0;
  let totalPresent = 0;
  let totalWheatGrams = 0;
  let totalRiceGrams = 0;
  let totalFruitEaten = 0;
  let totalConversionCost = 0;

  currentClasses.forEach((c) => {
    totalEnrolled += c.totalStudents;
    const presentCount = c.presentStudents.length;
    totalPresent += presentCount;
    totalWheatGrams += presentCount * grainPerStudent;
    totalRiceGrams += presentCount * grainPerStudent;
    totalConversionCost += presentCount * conversionCostPerStudent;

    c.presentStudents.forEach((s) => {
      if (fruitState[s.id] !== false) {
        totalFruitEaten += 1;
      }
    });
  });

  const totalFruitDidNotEat = totalPresent - totalFruitEaten;
  const totalFruitRupees = totalFruitEaten * FRUIT_COST_PER_STUDENT;

  const totalWheatKg = (totalWheatGrams / 1000).toFixed(2);
  const totalRiceKg = (totalRiceGrams / 1000).toFixed(2);

  // Format selected date nicely
  const displayDate = new Date(selectedDateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const schoolLevelLabel = schoolLevel === "primary"
    ? "Primary School / प्राथमिक विद्यालय (कक्षा 1–5)"
    : "Junior School / जूनियर विद्यालय (कक्षा 6–8)";

  const grainLabel = `${grainPerStudent}g`;

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#2D2A26] tracking-tight">
            Mid-Day Meal / एम.डी.एम.
          </h1>
          <div className="w-12 h-1 bg-[#6B1D30] rounded-xs mt-2 mb-2" />
          <p className="text-sm font-medium text-[#7A7267]">
            Grain consumption & fruit distribution with conversion cost (परिवर्तन लागत)
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex bg-white rounded-sm p-1 border border-[#E8E0D4] shadow-2xs">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xs text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "daily"
                ? "bg-[#6B1D30] text-white shadow-xs"
                : "text-[#7A7267] hover:text-[#2D2A26]"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Daily Register (दैनिक)
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-xs text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "monthly"
                ? "bg-[#6B1D30] text-white shadow-xs"
                : "text-[#7A7267] hover:text-[#2D2A26]"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Monthly Summary (मासिक)
          </button>
        </div>
      </div>

      {/* School Level Switcher - Primary / Junior */}
      <div className="inline-flex bg-white rounded-sm p-1 border border-[#E8E0D4] shadow-2xs">
        <button
          onClick={() => setSchoolLevel("primary")}
          className={`px-5 py-2.5 rounded-xs text-sm font-semibold transition-all flex items-center gap-1.5 ${
            schoolLevel === "primary"
              ? "bg-[#3D5A80] text-white shadow-xs"
              : "text-[#7A7267] hover:text-[#2D2A26] hover:bg-[#F3EDE4]/50"
          }`}
        >
          <School className="h-4 w-4 inline" /> Primary (कक्षा 1-5)
          <span className="ml-2 text-xs opacity-80">
            {grainPerStudent === GRAIN_PER_STUDENT_PRIMARY ? `${GRAIN_PER_STUDENT_PRIMARY}g · ₹${CONVERSION_COST_PRIMARY}` : ""}
          </span>
        </button>
        <button
          onClick={() => setSchoolLevel("junior")}
          className={`px-5 py-2.5 rounded-xs text-sm font-semibold transition-all flex items-center gap-1.5 ${
            schoolLevel === "junior"
              ? "bg-[#3D5A80] text-white shadow-xs"
              : "text-[#7A7267] hover:text-[#2D2A26] hover:bg-[#F3EDE4]/50"
          }`}
        >
          <GraduationCap className="h-4 w-4 inline" /> Junior (कक्षा 6-8)
          <span className="ml-2 text-xs opacity-80">
            {grainPerStudent === GRAIN_PER_STUDENT_JUNIOR ? `${GRAIN_PER_STUDENT_JUNIOR}g · ₹${CONVERSION_COST_JUNIOR}` : ""}
          </span>
        </button>
      </div>

      {/* Alert toast if message exists */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2 text-sm font-medium animate-in fade-in duration-200 ${
            saveMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: DAILY REGISTER                                                   */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-[#E8E0D4] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="mdm-date-picker" className="text-xs font-bold text-[#7A7267] uppercase tracking-wider">
                Select Date / दिनांक:
              </label>
              <input
                id="mdm-date-picker"
                type="date"
                value={dateInput}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-[#F3EDE4]/50 border border-[#E8E0D4] text-[#2D2A26] text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6B1D30]"
              />
              <button
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  handleDateChange(today);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#E8E0D4] hover:bg-[#F3EDE4] text-[#2D2A26] transition-colors"
              >
                Today (आज)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#7A7267] hidden md:inline">
                {displayDate}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs font-semibold border-[#E8E0D4]"
              >
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Register
              </Button>
            </div>
          </div>

          {/* School Level Badge */}
          <div className="bg-[#3D5A80]/5 border border-[#3D5A80]/20 rounded-xl px-5 py-3">
            <p className="text-sm font-bold text-[#3D5A80]">{schoolLevelLabel}</p>
            <p className="text-xs text-[#3D5A80]/70 mt-0.5">
              Wheat & Rice: {grainLabel}/student · Conversion Cost (परिवर्तन लागत): ₹{conversionCostPerStudent}/student · Fruit: ₹{FRUIT_COST_PER_STUDENT}/student
            </p>
          </div>

          {/* 5 Stat Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Present Students */}
            <div className="bg-white rounded-2xl border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#E8EDF2] text-[#3D5A80]">
                <Users className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#2D2A26] leading-none mb-1">
                  {totalPresent} <span className="text-xs font-normal text-[#7A7267]">/ {totalEnrolled}</span>
                </p>
                <p className="text-xs font-medium text-[#7A7267]">
                  Present (उपस्थित)
                </p>
              </div>
            </div>

            {/* Wheat */}
            <div className="bg-white rounded-2xl border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#FBF5E5] text-[#B8860B]">
                <Wheat className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#2D2A26] leading-none mb-1">
                  {totalWheatKg} <span className="text-xs font-bold text-[#7A7267]">kg</span>
                </p>
                <p className="text-xs font-medium text-[#7A7267]">
                  Wheat (गेहूं) · {grainLabel}/छात्र
                </p>
              </div>
            </div>

            {/* Rice */}
            <div className="bg-white rounded-2xl border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#E6F4F1] text-[#2A9D8F]">
                <Utensils className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#2D2A26] leading-none mb-1">
                  {totalRiceKg} <span className="text-xs font-bold text-[#7A7267]">kg</span>
                </p>
                <p className="text-xs font-medium text-[#7A7267]">
                  Rice (चावल) · {grainLabel}/छात्र
                </p>
              </div>
            </div>

            {/* Fruit */}
            <div className="bg-white rounded-2xl border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#FBECE9] text-[#E76F51]">
                <Apple className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#2D2A26] leading-none mb-1">
                  ₹{totalFruitRupees.toLocaleString("en-IN")}
                </p>
                <p className="text-xs font-medium text-[#7A7267]">
                  Fruit: {totalFruitEaten} ate · {totalFruitDidNotEat} skipped
                </p>
              </div>
            </div>

            {/* Conversion Cost */}
            <div className="bg-white rounded-sm border border-[#E8E0D4] p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0 bg-[#E8EDF2] text-[#3D5A80]">
                <IndianRupee className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-[#2D2A26] leading-none mb-1">
                  ₹{totalConversionCost.toFixed(2)}
                </p>
                <p className="text-xs font-medium text-[#7A7267]">
                  Conversion Cost (परिवर्तन लागत)
                </p>
              </div>
            </div>
          </div>

          {/* Class-wise MDM Table */}
          <div className="bg-white rounded-2xl border border-[#E8E0D4] overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-[#E8E0D4] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#2D2A26]">
                  Class-wise Daily MDM Distribution / कक्षावार वितरण
                </h2>
                <p className="text-xs text-[#7A7267] mt-0.5">
                  Calculated automatically from teacher marked attendance for {selectedDateStr}
                </p>
              </div>
              {totalPresent > 0 && (
                <Button
                  size="sm"
                  onClick={handleSaveFruitAttendance}
                  disabled={isPending}
                  className="bg-[#6B1D30] hover:bg-[#581726] text-white text-xs"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    "Save Today's MDM Log"
                  )}
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E8E0D4] bg-[#F3EDE4]/50 text-xs font-bold text-[#2D2A26] uppercase tracking-wider">
                    <th className="px-5 py-3.5">Class / कक्षा</th>
                    <th className="px-5 py-3.5 text-center">Present / उपस्थित</th>
                    <th className="px-5 py-3.5 text-right">Wheat / गेहूं ({grainLabel})</th>
                    <th className="px-5 py-3.5 text-right">Rice / चावल ({grainLabel})</th>
                    <th className="px-5 py-3.5 text-right">Fruit / फल (₹{FRUIT_COST_PER_STUDENT}/छात्र)</th>
                    <th className="px-5 py-3.5 text-right">Conversion Cost / परिवर्तन लागत</th>
                    <th className="px-5 py-3.5 text-center">Student Checklist</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D4]/70">
                  {currentClasses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-[#7A7267]">
                        No classes configured for this level in the current session.
                      </td>
                    </tr>
                  ) : (
                    currentClasses.map((cls) => {
                      const presentCount = cls.presentStudents.length;
                      const wheatGm = presentCount * grainPerStudent;
                      const wheatKg = (wheatGm / 1000).toFixed(2);
                      const riceGm = presentCount * grainPerStudent;
                      const riceKg = (riceGm / 1000).toFixed(2);
                      const classCost = presentCount * conversionCostPerStudent;

                      let fruitAteInClass = 0;
                      cls.presentStudents.forEach((s) => {
                        if (fruitState[s.id] !== false) {
                          fruitAteInClass += 1;
                        }
                      });
                      const fruitDidNotEatInClass = presentCount - fruitAteInClass;
                      const fruitCostInClass = fruitAteInClass * FRUIT_COST_PER_STUDENT;

                      return (
                        <tr key={cls.sectionId} className="hover:bg-[#F3EDE4]/25 transition-colors">
                          {/* Class / Section */}
                          <td className="px-5 py-4 font-semibold text-[#2D2A26]">
                            Class {cls.className} ({cls.sectionName})
                            <span className="block text-[11px] font-normal text-[#7A7267]">
                              {cls.totalStudents} enrolled
                            </span>
                          </td>

                          {/* Present count */}
                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-sm text-xs font-bold ${
                                presentCount > 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {presentCount} / {cls.totalStudents}
                            </span>
                          </td>

                          {/* Wheat Column */}
                          <td className="px-5 py-4 text-right font-medium text-[#2D2A26]">
                            <span className="font-bold text-[#6B1D30]">{wheatGm.toLocaleString("en-IN")} gm</span>
                            <span className="block text-xs text-[#7A7267]">({wheatKg} kg)</span>
                          </td>

                          {/* Rice Column */}
                          <td className="px-5 py-4 text-right font-medium text-[#2D2A26]">
                            <span className="font-bold text-[#2A9D8F]">{riceGm.toLocaleString("en-IN")} gm</span>
                            <span className="block text-xs text-[#7A7267]">({riceKg} kg)</span>
                          </td>

                          {/* Fruit Column */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-bold text-[#E76F51]">₹{fruitCostInClass}</span>
                            <span className="block text-xs text-[#7A7267]">
                              {fruitAteInClass} ate · {fruitDidNotEatInClass} skipped
                            </span>
                          </td>

                          {/* Conversion Cost Column */}
                          <td className="px-5 py-4 text-right">
                            <span className="font-bold text-[#3D5A80]">₹{classCost.toFixed(2)}</span>
                            <span className="block text-xs text-[#7A7267]">
                              ₹{conversionCostPerStudent} × {presentCount}
                            </span>
                          </td>

                          {/* Action to view / toggle students who ate fruit */}
                          <td className="px-5 py-4 text-center">
                            {presentCount > 0 ? (
                              <button
                                onClick={() => setSelectedClassForChecklist(cls)}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#6B1D30]/30 text-[#6B1D30] hover:bg-[#6B1D30]/5 transition-colors"
                              >
                                View Fruit Checklist <ChevronRight className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-xs text-[#7A7267] italic">No attendance marked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Summary Total Row */}
                {currentClasses.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#6B1D30] bg-[#F3EDE4]/70 font-bold text-[#2D2A26]">
                      <td className="px-5 py-4 text-sm font-bold">
                        {schoolLevel === "primary" ? "Primary Total (प्राथमिक कुल)" : "Junior Total (जूनियर कुल)"}
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-bold">
                        {totalPresent} / {totalEnrolled}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-[#6B1D30]">
                        {totalWheatGrams.toLocaleString("en-IN")} gm
                        <span className="block text-xs font-normal text-[#7A7267]">({totalWheatKg} kg)</span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-[#2A9D8F]">
                        {totalRiceGrams.toLocaleString("en-IN")} gm
                        <span className="block text-xs font-normal text-[#7A7267]">({totalRiceKg} kg)</span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-[#E76F51]">
                        ₹{totalFruitRupees.toLocaleString("en-IN")}
                        <span className="block text-xs font-normal text-[#7A7267]">
                          {totalFruitEaten} ate · {totalFruitDidNotEat} skipped
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-[#3D5A80]">
                        ₹{totalConversionCost.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Button
                          size="sm"
                          onClick={handleSaveFruitAttendance}
                          disabled={isPending}
                          className="bg-[#6B1D30] hover:bg-[#581726] text-white text-xs"
                        >
                          {isPending ? "Saving..." : "Save All"}
                        </Button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MONTHLY SUMMARY LOG                                              */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-[#E8E0D4] p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label htmlFor="mdm-month-picker" className="text-xs font-bold text-[#7A7267] uppercase tracking-wider">
                Select Month / माह:
              </label>
              <input
                id="mdm-month-picker"
                type="month"
                value={monthInput}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-[#F3EDE4]/50 border border-[#E8E0D4] text-[#2D2A26] text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6B1D30]"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-semibold border-[#E8E0D4]"
            >
              <Printer className="h-3.5 w-3.5 mr-1" /> Print Monthly Log
            </Button>
          </div>

          {/* School Level Badge */}
          <div className="bg-[#3D5A80]/5 border border-[#3D5A80]/20 rounded-xl px-5 py-3">
            <p className="text-sm font-bold text-[#3D5A80]">{schoolLevelLabel}</p>
            <p className="text-xs text-[#3D5A80]/70 mt-0.5">
              Wheat & Rice: {grainLabel}/student · Conversion Cost: ₹{conversionCostPerStudent}/student
            </p>
          </div>

          {/* Monthly Table */}
          <div className="bg-white rounded-2xl border border-[#E8E0D4] overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-[#E8E0D4]">
              <h2 className="text-base font-bold text-[#2D2A26]">
                Monthly Mid-Day Meal Register / मासिक एम.डी.एम. पंजी
              </h2>
              <p className="text-xs text-[#7A7267] mt-0.5">
                Consolidated daily log - {schoolLevel === "primary" ? "Primary (1-5)" : "Junior (6-8)"}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E8E0D4] bg-[#F3EDE4]/50 text-xs font-bold text-[#2D2A26] uppercase tracking-wider">
                    <th className="px-4 py-3">Date / दिनांक</th>
                    <th className="px-4 py-3">Day / वार</th>
                    <th className="px-4 py-3 text-center">Present Students</th>
                    <th className="px-4 py-3 text-right">Wheat / गेहूं (kg)</th>
                    <th className="px-4 py-3 text-right">Rice / चावल (kg)</th>
                    <th className="px-4 py-3 text-right">Fruits Eaten</th>
                    <th className="px-4 py-3 text-right">Fruit Cost / फल (₹)</th>
                    <th className="px-4 py-3 text-right">Conversion Cost / परिवर्तन लागत (₹)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E0D4]/70">
                  {currentMonthlyLogs.map((log) => {
                    const wheatKg = (log.wheatGrams / 1000).toFixed(2);
                    const riceKg = (log.riceGrams / 1000).toFixed(2);

                    return (
                      <tr
                        key={log.dateStr}
                        className={`hover:bg-[#F3EDE4]/25 transition-colors ${
                          log.dayOfWeek === "Sunday" ? "bg-amber-50/40 opacity-70" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#2D2A26]">
                          {log.dateStr}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#7A7267]">
                          {log.dayOfWeek}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {log.hasAttendance ? (
                            <span className="font-bold text-emerald-700">{log.totalPresent}</span>
                          ) : (
                            <span className="text-xs text-[#7A7267]">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#6B1D30]">
                          {log.hasAttendance ? `${wheatKg} kg` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#2A9D8F]">
                          {log.hasAttendance ? `${riceKg} kg` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {log.hasAttendance ? log.fruitsEaten : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#E76F51]">
                          {log.hasAttendance ? `₹${log.fruitCost}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#3D5A80]">
                          {log.hasAttendance ? `₹${log.conversionCost.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              handleDateChange(log.dateStr);
                              setActiveTab("daily");
                            }}
                            className="text-xs text-[#6B1D30] font-semibold hover:underline"
                          >
                            Open Day →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Monthly Totals */}
                <tfoot>
                  {(() => {
                    const monthTotalPresent = currentMonthlyLogs.reduce((s, l) => s + l.totalPresent, 0);
                    const monthTotalWheatGrams = currentMonthlyLogs.reduce((s, l) => s + l.wheatGrams, 0);
                    const monthTotalRiceGrams = currentMonthlyLogs.reduce((s, l) => s + l.riceGrams, 0);
                    const monthTotalFruitCost = currentMonthlyLogs.reduce((s, l) => s + l.fruitCost, 0);
                    const monthTotalFruitsEaten = currentMonthlyLogs.reduce((s, l) => s + l.fruitsEaten, 0);
                    const monthTotalConvCost = currentMonthlyLogs.reduce((s, l) => s + l.conversionCost, 0);

                    return (
                      <tr className="border-t-2 border-[#6B1D30] bg-[#F3EDE4]/80 font-bold text-[#2D2A26]">
                        <td colSpan={2} className="px-4 py-4 text-sm">
                          Monthly Grand Total (मासिक कुल योग)
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-bold">
                          {monthTotalPresent}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold text-[#6B1D30]">
                          {(monthTotalWheatGrams / 1000).toFixed(2)} kg
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold text-[#2A9D8F]">
                          {(monthTotalRiceGrams / 1000).toFixed(2)} kg
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold">
                          {monthTotalFruitsEaten}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold text-[#E76F51]">
                          ₹{monthTotalFruitCost.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-bold text-[#3D5A80]">
                          ₹{monthTotalConvCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-4" />
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* MODAL: STUDENT FRUIT CHECKLIST                                          */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {selectedClassForChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedClassForChecklist(null)}
          />
          <div className="relative bg-white rounded-2xl border border-[#E8E0D4] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col z-10 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[#E8E0D4] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#2D2A26]">
                  Fruit Distribution / फल वितरण चेकलिस्ट
                </h3>
                <p className="text-xs text-[#7A7267] mt-0.5">
                  Class {selectedClassForChecklist.className} ({selectedClassForChecklist.sectionName}) · Date: {selectedDateStr}
                </p>
              </div>
              <button
                onClick={() => setSelectedClassForChecklist(null)}
                className="p-1.5 rounded-lg text-[#7A7267] hover:text-[#2D2A26] hover:bg-[#F3EDE4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Bulk Toggle Buttons */}
            <div className="px-6 py-3 bg-[#F3EDE4]/50 border-b border-[#E8E0D4] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#7A7267]">
                Rate: ₹{FRUIT_COST_PER_STUDENT} per student who ate fruit
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllInClass(selectedClassForChecklist.presentStudents, true)}
                  className="text-xs font-semibold px-2.5 py-1 rounded border border-[#E8E0D4] bg-white text-emerald-800 hover:bg-emerald-50"
                >
                  Select All (सभी)
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllInClass(selectedClassForChecklist.presentStudents, false)}
                  className="text-xs font-semibold px-2.5 py-1 rounded border border-[#E8E0D4] bg-white text-rose-800 hover:bg-rose-50"
                >
                  Deselect All (कोई नहीं)
                </button>
              </div>
            </div>

            {/* Student list with checkboxes */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {selectedClassForChecklist.presentStudents.map((s, idx) => {
                const ateFruit = fruitState[s.id] !== false;
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleStudentFruit(s.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      ateFruit
                        ? "border-[#E8E0D4] bg-white hover:bg-[#F3EDE4]/30"
                        : "border-red-200 bg-red-50/30 hover:bg-red-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#7A7267] w-6">
                        {idx + 1}.
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#2D2A26] leading-tight">
                          {s.fullName}
                        </p>
                        <p className="text-xs font-mono text-[#7A7267]">
                          Adm: {s.admissionNo} · {s.gender}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          ateFruit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ateFruit ? `Ate Fruit (₹${FRUIT_COST_PER_STUDENT})` : "Didn't Eat (₹0)"}
                      </span>
                      {ateFruit ? (
                        <CheckSquare className="h-5 w-5 text-[#6B1D30]" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E8E0D4] bg-[#F3EDE4]/40 flex items-center justify-between">
              {(() => {
                const ateCount = selectedClassForChecklist.presentStudents.filter(
                  (s) => fruitState[s.id] !== false
                ).length;
                const cost = ateCount * FRUIT_COST_PER_STUDENT;
                return (
                  <div>
                    <span className="text-sm font-bold text-[#2D2A26]">
                      {ateCount} Ate · {selectedClassForChecklist.presentStudents.length - ateCount} Skipped
                    </span>
                    <span className="block text-xs font-bold text-[#E76F51]">
                      Total Fruit Cost: ₹{cost}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClassForChecklist(null)}
                  className="border-[#E8E0D4]"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveFruitAttendance}
                  disabled={isPending}
                  className="bg-[#6B1D30] hover:bg-[#581726] text-white"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    "Confirm & Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
