"use client";

import { useState, useRef } from "react";
import { Printer, Clock, Edit3 } from "lucide-react";

// ─── Hardcoded Data ────────────────────────────────────────────────
const PRIMARY_CLASSES = ["1", "2", "3", "4", "5"];
const JUNIOR_CLASSES = ["6", "7", "8"];

const PRIMARY_TEACHERS = [
  "Durga Prasad",
  "Rajan Singh",
  "Anand Kaushal Srivastava",
  "Poonam Kannaujia",
  "Babita Pandey",
];

const JUNIOR_TEACHERS = [
  "Arti Pandey",
  "Akahnd Pratap Singh",
  "Komal Singh",
  "Neelam Singh",
  "Pallavi Tiwari",
  "Vijay Kumar Mishra",
];

const SUBJECTS = [
  "Hindi / हिन्दी",
  "Maths / गणित",
  "Science / विज्ञान",
  "Social Science / सामाजिक विज्ञान",
  "Sanskrit / संस्कृत",
  "English / अंग्रेजी",
  "Env. Science / पर्यावरण / Home Science / गृह विज्ञान",
  "Hamara Paryavaran / हमारा पर्यावरण",
  "Sports & Health / खेल और स्वास्थ्य / Home Craft / गृह शिल्प",
];

const DEFAULT_TIMES = [
  { start: "08:00", end: "08:40" },
  { start: "08:40", end: "09:20" },
  { start: "09:20", end: "10:00" },
  { start: "10:00", end: "10:40" },
  { start: "10:40", end: "11:00" }, // Recess
  { start: "11:00", end: "11:40" },
  { start: "11:40", end: "12:20" },
  { start: "12:20", end: "01:00" },
];

// ─── Types ─────────────────────────────────────────────────────────
interface PeriodTime {
  start: string;
  end: string;
}

// Key: `${period}-${className}`, Value: { teacher, subject }
type CellData = Record<string, { teacher: string; subject: string }>;

function cellKey(period: number, className: string) {
  return `${period}-${className}`;
}

// ─── Timetable Grid Component ──────────────────────────────────────
function TimetableGrid({
  title,
  classes,
  teachers,
  periodTimes,
  cellData,
  onCellChange,
  printRef,
}: {
  title: string;
  classes: string[];
  teachers: string[];
  periodTimes: PeriodTime[];
  cellData: CellData;
  onCellChange: (period: number, cls: string, field: "teacher" | "subject", value: string) => void;
  printRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={printRef} className="bg-white border border-gray-200 rounded-lg overflow-hidden print:border-black print:rounded-none">
      {/* Title */}
      <div className="px-4 py-3 bg-[#6B1D30] text-white print:bg-white print:text-black print:border-b-2 print:border-black">
        <h2 className="text-sm font-bold print:text-lg print:text-center">
          {title}
        </h2>
        <p className="text-[11px] text-white/70 print:text-black print:text-center print:text-sm">
          Composite Vidyalaya Chandpur Tarhar — समय सारणी
        </p>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs min-w-[700px] print:min-w-0 print:text-[10px]">
          <thead>
            <tr className="bg-gray-50 print:bg-gray-200">
              <th className="border border-gray-300 px-2 py-2 text-left font-bold text-gray-700 w-[130px] print:w-[100px]">
                Period / कालांश
              </th>
              {classes.map((cls) => (
                <th
                  key={cls}
                  className="border border-gray-300 px-2 py-2 text-center font-bold text-gray-700"
                >
                  Class {cls} / कक्षा {cls}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodTimes.map((time, idx) => {
              const periodNum = idx + 1;
              // Check if this is a recess period (period 5 with default times)
              const isRecess = idx === 4 && time.start === "10:40" && time.end === "11:00";

              if (isRecess) {
                return (
                  <tr key={idx} className="bg-amber-50 print:bg-gray-100">
                    <td
                      colSpan={classes.length + 1}
                      className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700 print:text-black"
                    >
                      🍽️ Recess / मध्यावकाश ({time.start} – {time.end})
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={idx} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                  {/* Period Column */}
                  <td className="border border-gray-300 px-2 py-2 bg-gray-50/50 print:bg-transparent">
                    <div className="font-bold text-gray-800 text-[11px]">
                      Period {periodNum > 4 ? periodNum - 1 : periodNum}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                      {time.start} – {time.end}
                    </div>
                  </td>

                  {/* Class Cells */}
                  {classes.map((cls) => {
                    const key = cellKey(idx, cls);
                    const data = cellData[key] || { teacher: "", subject: "" };

                    return (
                      <td key={cls} className="border border-gray-300 px-1.5 py-1.5 align-top">
                        {/* Teacher Dropdown */}
                        <select
                          value={data.teacher}
                          onChange={(e) => onCellChange(idx, cls, "teacher", e.target.value)}
                          className="w-full border border-gray-200 rounded px-1 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] mb-1 print:border-gray-400 print:text-[9px]"
                        >
                          <option value="">— Teacher —</option>
                          {teachers.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>

                        {/* Subject Dropdown */}
                        <select
                          value={data.subject}
                          onChange={(e) => onCellChange(idx, cls, "subject", e.target.value)}
                          className="w-full border border-gray-200 rounded px-1 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] print:border-gray-400 print:text-[9px]"
                        >
                          <option value="">— Subject —</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Timetable Page Component ─────────────────────────────────
export function PrintableTimetable() {
  // Period times (editable)
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(DEFAULT_TIMES);
  const [editingTimes, setEditingTimes] = useState(false);

  // Cell data for Primary and Junior
  const [primaryData, setPrimaryData] = useState<CellData>({});
  const [juniorData, setJuniorData] = useState<CellData>({});

  const primaryRef = useRef<HTMLDivElement>(null);
  const juniorRef = useRef<HTMLDivElement>(null);

  function handlePrimaryCellChange(period: number, cls: string, field: "teacher" | "subject", value: string) {
    const key = cellKey(period, cls);
    setPrimaryData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleJuniorCellChange(period: number, cls: string, field: "teacher" | "subject", value: string) {
    const key = cellKey(period, cls);
    setJuniorData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleTimeChange(idx: number, field: "start" | "end", value: string) {
    setPeriodTimes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs text-gray-500">
            Fill the timetable grids below and print. Data is not saved to the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingTimes(!editingTimes)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            {editingTimes ? "Done Editing Times" : "Edit Period Times"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-md transition-colors"
            style={{ background: "hsl(var(--primary))" }}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Timetable
          </button>
        </div>
      </div>

      {/* Period Times Editor */}
      {editingTimes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 print:hidden">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Edit Period Times / कालांश समय संपादित करें
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {periodTimes.map((time, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-gray-600 w-10 shrink-0">P{idx + 1}:</span>
                <input
                  type="time"
                  value={time.start}
                  onChange={(e) => handleTimeChange(idx, "start", e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  value={time.end}
                  onChange={(e) => handleTimeChange(idx, "end", e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Section (Classes 1-5) */}
      <TimetableGrid
        title="Primary Section / प्राथमिक विभाग (Classes 1–5)"
        classes={PRIMARY_CLASSES}
        teachers={PRIMARY_TEACHERS}
        periodTimes={periodTimes}
        cellData={primaryData}
        onCellChange={handlePrimaryCellChange}
        printRef={primaryRef}
      />

      {/* Junior Section (Classes 6-8) */}
      <TimetableGrid
        title="Junior Section / जूनियर विभाग (Classes 6–8)"
        classes={JUNIOR_CLASSES}
        teachers={JUNIOR_TEACHERS}
        periodTimes={periodTimes}
        cellData={juniorData}
        onCellChange={handleJuniorCellChange}
        printRef={juniorRef}
      />
    </div>
  );
}
