"use client";

import { useState, useRef } from "react";
import { Printer, Clock, Edit3, Calendar } from "lucide-react";

// ─── Hardcoded Data ────────────────────────────────────────────────
const PRIMARY_CLASSES = ["1", "2", "3", "4", "5"];
const JUNIOR_CLASSES = ["6", "7", "8"];

const PRIMARY_TEACHERS = [
  "Arti Pandey",
  "Akahnd Pratap Singh",
  "Komal Singh",
  "Neelam Singh",
  "Pallavi Tiwari",
  "Vijay Kumar Mishra",
];

const JUNIOR_TEACHERS = [
  "Durga Prasad",
  "Rajan Singh",
  "Anand Kaushal Srivastava",
  "Poonam Kannaujia",
  "Babita Pandey",
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

const DAYS = [
  { key: "monday", label: "Monday / सोमवार" },
  { key: "tuesday", label: "Tuesday / मंगलवार" },
  { key: "wednesday", label: "Wednesday / बुधवार" },
  { key: "thursday", label: "Thursday / गुरुवार" },
  { key: "friday", label: "Friday / शुक्रवार" },
  { key: "saturday", label: "Saturday / शनिवार" },
];

// 8 teaching periods
const DEFAULT_PERIOD_TIMES = [
  { start: "08:00", end: "08:40" },
  { start: "08:40", end: "09:20" },
  { start: "09:20", end: "10:00" },
  { start: "10:00", end: "10:40" },
  { start: "11:00", end: "11:40" },
  { start: "11:40", end: "12:20" },
  { start: "12:20", end: "01:00" },
  { start: "01:00", end: "01:40" },
];

// Recess sits between period 4 and period 5
const DEFAULT_RECESS = { start: "10:40", end: "11:00" };
const DEFAULT_RECESS_AFTER_PERIOD = 4; // Recess appears after period 4

// ─── Types ─────────────────────────────────────────────────────────
interface PeriodTime {
  start: string;
  end: string;
}

// Key: `${day}-${periodIndex}-${className}`, Value: { teacher, subject }
type CellData = Record<string, { teacher: string; subject: string }>;

function cellKey(day: string, periodIndex: number, className: string) {
  return `${day}-${periodIndex}-${className}`;
}

// ─── Timetable Grid Component ──────────────────────────────────────
function TimetableGrid({
  title,
  dayLabel,
  classes,
  teachers,
  periodTimes,
  recessTime,
  recessAfterPeriod,
  cellData,
  day,
  onCellChange,
}: {
  title: string;
  dayLabel: string;
  classes: string[];
  teachers: string[];
  periodTimes: PeriodTime[];
  recessTime: PeriodTime;
  recessAfterPeriod: number;
  cellData: CellData;
  day: string;
  onCellChange: (day: string, periodIndex: number, cls: string, field: "teacher" | "subject", value: string) => void;
}) {
  // Build rows: interleave periods with recess
  const rows: { type: "period"; periodNum: number; periodIndex: number; time: PeriodTime }[] | { type: "recess"; time: PeriodTime }[] = [];

  for (let i = 0; i < periodTimes.length; i++) {
    (rows as any[]).push({
      type: "period",
      periodNum: i + 1,
      periodIndex: i,
      time: periodTimes[i],
    });

    // Insert recess after the specified period
    if (i + 1 === recessAfterPeriod) {
      (rows as any[]).push({
        type: "recess",
        time: recessTime,
      });
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden print:border-black print:rounded-none print:mb-4">
      {/* Title */}
      <div className="px-4 py-3 bg-[#6B1D30] text-white print:bg-white print:text-black print:border-b-2 print:border-black print:py-2">
        <h2 className="text-sm font-bold print:text-base print:text-center">
          {title}
        </h2>
        <p className="text-[11px] text-white/70 print:text-black print:text-center print:text-xs print:font-medium">
          {dayLabel}
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
            {(rows as any[]).map((row, rowIdx) => {
              if (row.type === "recess") {
                return (
                  <tr key={`recess-${rowIdx}`} className="bg-amber-50 print:bg-gray-100">
                    <td
                      colSpan={classes.length + 1}
                      className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700 print:text-black"
                    >
                      Recess / मध्यावकाश ({row.time.start} – {row.time.end})
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={`period-${row.periodIndex}`} className="hover:bg-gray-50/50 print:hover:bg-transparent">
                  {/* Period Column */}
                  <td className="border border-gray-300 px-2 py-2 bg-gray-50/50 print:bg-transparent">
                    <div className="font-bold text-gray-800 text-[11px]">
                      Period {row.periodNum} / कालांश {row.periodNum}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                      {row.time.start} – {row.time.end}
                    </div>
                  </td>

                  {/* Class Cells */}
                  {classes.map((cls) => {
                    const key = cellKey(day, row.periodIndex, cls);
                    const data = cellData[key] || { teacher: "", subject: "" };

                    return (
                      <td key={cls} className="border border-gray-300 px-1.5 py-1.5 align-top">
                        {/* Teacher Dropdown */}
                        <select
                          value={data.teacher}
                          onChange={(e) => onCellChange(day, row.periodIndex, cls, "teacher", e.target.value)}
                          className="w-full border border-gray-200 rounded px-1 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] mb-1 print:border-gray-400 print:text-[9px] print:appearance-none"
                        >
                          <option value="">— Teacher —</option>
                          {teachers.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>

                        {/* Subject Dropdown */}
                        <select
                          value={data.subject}
                          onChange={(e) => onCellChange(day, row.periodIndex, cls, "subject", e.target.value)}
                          className="w-full border border-gray-200 rounded px-1 py-0.5 text-[10px] bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1D30] print:border-gray-400 print:text-[9px] print:appearance-none"
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
  // 8 period times (editable)
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(DEFAULT_PERIOD_TIMES);
  // Recess time (editable, separate from periods)
  const [recessTime, setRecessTime] = useState<PeriodTime>(DEFAULT_RECESS);
  const [editingTimes, setEditingTimes] = useState(false);

  // Active day
  const [activeDay, setActiveDay] = useState(DAYS[0].key);
  const activeDayLabel = DAYS.find((d) => d.key === activeDay)?.label ?? "";

  // Cell data for Primary and Junior (per-day keyed)
  const [primaryData, setPrimaryData] = useState<CellData>({});
  const [juniorData, setJuniorData] = useState<CellData>({});

  const printAreaRef = useRef<HTMLDivElement>(null);

  function handlePrimaryCellChange(day: string, periodIndex: number, cls: string, field: "teacher" | "subject", value: string) {
    const key = cellKey(day, periodIndex, cls);
    setPrimaryData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleJuniorCellChange(day: string, periodIndex: number, cls: string, field: "teacher" | "subject", value: string) {
    const key = cellKey(day, periodIndex, cls);
    setJuniorData((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handlePeriodTimeChange(idx: number, field: "start" | "end", value: string) {
    setPeriodTimes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function handleRecessTimeChange(field: "start" | "end", value: string) {
    setRecessTime((prev) => ({ ...prev, [field]: value }));
  }

  function handlePrint() {
    // Use a new window to print only the timetable content
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>समय सारणी — Composite School Chandpur Tarhar</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: "Times New Roman", Georgia, serif; font-size: 11px; color: #000; padding: 12px; }
            .print-header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .print-header h1 { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
            .print-header p { font-size: 12px; }
            .section-block { margin-bottom: 20px; page-break-inside: avoid; }
            .section-title { font-size: 14px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 6px; margin-bottom: 0; background: #f0f0f0; }
            .section-subtitle { font-size: 11px; text-align: center; padding: 3px; border-left: 2px solid #000; border-right: 2px solid #000; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 4px 5px; text-align: center; font-size: 10px; vertical-align: top; }
            th { background: #e8e8e8; font-weight: bold; font-size: 10px; }
            td.period-col { text-align: left; font-weight: bold; background: #f8f8f8; width: 100px; }
            .recess-row td { background: #f5f0e0; font-weight: bold; text-align: center; font-size: 11px; }
            .cell-teacher { font-weight: bold; font-size: 9px; }
            .cell-subject { font-size: 9px; color: #444; margin-top: 2px; }
            .signature-block { margin-top: 40px; display: flex; justify-content: flex-end; }
            .signature-line { text-align: center; width: 220px; }
            .signature-line .line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; font-weight: bold; font-size: 12px; }
            @media print {
              body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .section-block { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Build print-ready HTML content for the ref
  function buildPrintRows(periodTimes: PeriodTime[], recessTime: PeriodTime, recessAfterPeriod: number) {
    const rows: any[] = [];
    for (let i = 0; i < periodTimes.length; i++) {
      rows.push({ type: "period", periodNum: i + 1, periodIndex: i, time: periodTimes[i] });
      if (i + 1 === recessAfterPeriod) {
        rows.push({ type: "recess", time: recessTime });
      }
    }
    return rows;
  }

  const printRows = buildPrintRows(periodTimes, recessTime, DEFAULT_RECESS_AFTER_PERIOD);

  function renderPrintTable(title: string, classes: string[], data: CellData) {
    return (
      <div className="section-block">
        <div className="section-title">{title}</div>
        <div className="section-subtitle">{activeDayLabel}</div>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: "100px" }}>Period / कालांश</th>
              {classes.map((cls) => (
                <th key={cls}>Class {cls} / कक्षा {cls}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {printRows.map((row: any, rowIdx: number) => {
              if (row.type === "recess") {
                return (
                  <tr key={`recess-${rowIdx}`} className="recess-row">
                    <td colSpan={classes.length + 1}>
                      Recess / मध्यावकाश ({row.time.start} – {row.time.end})
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={`period-${row.periodIndex}`}>
                  <td className="period-col">
                    <div>Period {row.periodNum} / कालांश {row.periodNum}</div>
                    <div style={{ fontWeight: "normal", fontSize: "9px", color: "#666" }}>
                      {row.time.start} – {row.time.end}
                    </div>
                  </td>
                  {classes.map((cls) => {
                    const key = cellKey(activeDay, row.periodIndex, cls);
                    const cell = data[key] || { teacher: "", subject: "" };
                    return (
                      <td key={cls}>
                        {cell.teacher && <div className="cell-teacher">{cell.teacher}</div>}
                        {cell.subject && <div className="cell-subject">{cell.subject}</div>}
                        {!cell.teacher && !cell.subject && <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            Select a day, fill the timetable grids, and print. Data is not saved to the database.
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

      {/* Day Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0 ml-1 mr-1" />
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveDay(d.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeDay === d.key
                  ? "bg-[#6B1D30] text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period & Recess Times Editor */}
      {editingTimes && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Edit Period & Recess Times / कालांश एवं मध्यावकाश समय संपादित करें
          </h3>

          {/* Period Times */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {periodTimes.map((time, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-gray-600 w-14 shrink-0">Period {idx + 1}:</span>
                <input
                  type="time"
                  value={time.start}
                  onChange={(e) => handlePeriodTimeChange(idx, "start", e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  value={time.end}
                  onChange={(e) => handlePeriodTimeChange(idx, "end", e.target.value)}
                  className="border border-gray-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
                />
              </div>
            ))}
          </div>

          {/* Recess Time */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-amber-700 w-14 shrink-0">Recess:</span>
              <input
                type="time"
                value={recessTime.start}
                onChange={(e) => handleRecessTimeChange("start", e.target.value)}
                className="border border-amber-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                value={recessTime.end}
                onChange={(e) => handleRecessTimeChange("end", e.target.value)}
                className="border border-amber-300 rounded px-1.5 py-1 text-xs w-[85px] focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50"
              />
              <span className="text-[10px] text-gray-400 ml-2">(Appears after Period {DEFAULT_RECESS_AFTER_PERIOD})</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Section (Classes 1-5) */}
      <TimetableGrid
        title="Primary Section / प्राथमिक विभाग (Classes 1–5)"
        dayLabel={activeDayLabel}
        classes={PRIMARY_CLASSES}
        teachers={PRIMARY_TEACHERS}
        periodTimes={periodTimes}
        recessTime={recessTime}
        recessAfterPeriod={DEFAULT_RECESS_AFTER_PERIOD}
        cellData={primaryData}
        day={activeDay}
        onCellChange={handlePrimaryCellChange}
      />

      {/* Junior Section (Classes 6-8) */}
      <TimetableGrid
        title="Junior Section / जूनियर विभाग (Classes 6–8)"
        dayLabel={activeDayLabel}
        classes={JUNIOR_CLASSES}
        teachers={JUNIOR_TEACHERS}
        periodTimes={periodTimes}
        recessTime={recessTime}
        recessAfterPeriod={DEFAULT_RECESS_AFTER_PERIOD}
        cellData={juniorData}
        day={activeDay}
        onCellChange={handleJuniorCellChange}
      />

      {/* Hidden Print-Only Content (rendered via popup window) */}
      <div ref={printAreaRef} style={{ display: "none" }}>
        <div className="print-header">
          <h1>कम्पोजिट विद्यालय चांदपुर तरहर</h1>
          <p>Composite School Chandpur Tarhar</p>
          <p style={{ marginTop: "4px", fontSize: "13px", fontWeight: "bold" }}>
            समय सारणी / Timetable — {activeDayLabel}
          </p>
        </div>

        {renderPrintTable(
          "Primary Section / प्राथमिक विभाग (Classes 1–5)",
          PRIMARY_CLASSES,
          primaryData
        )}

        {renderPrintTable(
          "Junior Section / जूनियर विभाग (Classes 6–8)",
          JUNIOR_CLASSES,
          juniorData
        )}

        <div className="signature-block">
          <div className="signature-line">
            <div className="line">
              Headmaster / प्रधानाध्यापक
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
