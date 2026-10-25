"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Printer,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Filter,
  Users,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────
export interface SectionAttendanceData {
  className: string;
  sectionName: string;
  totalBoys: number;
  totalGirls: number;
  totalStudents: number;
  workingDays: number;
  boysPresent: number;
  girlsPresent: number;
  totalPresent: number;
  boysAvg?: string;
  girlsAvg?: string;
  totalAvg?: string;
  boysPct: number;
  girlsPct: number;
  totalPct: number;
}

export interface SchoolInfo {
  schoolName: string;
  schoolNameHindi?: string;
  address: string;
  udiseCode: string;
  schoolBlock: string;
  schoolDistrict: string;
  registerSubtitle?: string;
}

export interface PrintableAttendanceReportProps {
  sections: SectionAttendanceData[];
  selectedDate: string;
  mode: "daily" | "weekly" | "monthly";
  dateRangeLabel: string;
  workingDays: number;
  schoolInfo: SchoolInfo;
}

const PRIMARY_CLASSES = ["1", "2", "3", "4", "5"];

function isPrimary(className: string) {
  return PRIMARY_CLASSES.includes(className);
}

export function PrintableAttendanceReport({
  sections,
  selectedDate,
  mode,
  dateRangeLabel,
  workingDays,
  schoolInfo,
}: PrintableAttendanceReportProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dateInput, setDateInput] = useState(selectedDate);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>("ALL");

  // Filter sections by Primary & Junior
  const primarySections = sections.filter((s) => isPrimary(s.className));
  const juniorSections = sections.filter((s) => !isPrimary(s.className));

  // Compute aggregate for a group
  function aggregateGroup(group: SectionAttendanceData[]) {
    let totalBoys = 0;
    let totalGirls = 0;
    let totalStudents = 0;
    let boysPresent = 0;
    let girlsPresent = 0;
    let totalPresent = 0;

    for (const s of group) {
      totalBoys += s.totalBoys;
      totalGirls += s.totalGirls;
      totalStudents += s.totalStudents;
      boysPresent += s.boysPresent;
      girlsPresent += s.girlsPresent;
      totalPresent += s.totalPresent;
    }

    const possibleBoys = mode === "daily" ? totalBoys : totalBoys * Math.max(1, workingDays);
    const possibleGirls = mode === "daily" ? totalGirls : totalGirls * Math.max(1, workingDays);
    const possibleTotal = mode === "daily" ? totalStudents : totalStudents * Math.max(1, workingDays);

    const boysPct = possibleBoys > 0 ? Math.round((boysPresent / possibleBoys) * 100) : 0;
    const girlsPct = possibleGirls > 0 ? Math.round((girlsPresent / possibleGirls) * 100) : 0;
    const totalPct = possibleTotal > 0 ? Math.round((totalPresent / possibleTotal) * 100) : 0;

    const boysAvg = workingDays > 0 ? (boysPresent / workingDays).toFixed(1) : "0";
    const girlsAvg = workingDays > 0 ? (girlsPresent / workingDays).toFixed(1) : "0";
    const totalAvg = workingDays > 0 ? (totalPresent / workingDays).toFixed(1) : "0";

    return {
      totalBoys,
      totalGirls,
      totalStudents,
      boysPresent,
      girlsPresent,
      totalPresent,
      boysPct,
      girlsPct,
      totalPct,
      boysAvg,
      girlsAvg,
      totalAvg,
    };
  }

  const primaryAgg = aggregateGroup(primarySections);
  const juniorAgg = aggregateGroup(juniorSections);
  const grandAgg = aggregateGroup(sections);

  // Navigation handlers
  function handleModeChange(newMode: "daily" | "weekly" | "monthly") {
    startTransition(() => {
      router.push(`${pathname}?mode=${newMode}&date=${dateInput}`);
    });
  }

  function handleDateApply(newDate: string) {
    setDateInput(newDate);
    startTransition(() => {
      router.push(`${pathname}?mode=${mode}&date=${newDate}`);
    });
  }

  // Print function
  function handlePrint(target: "all" | "primary" | "junior") {
    const printWindow = window.open("", "_blank", "width=1100,height=850");
    if (!printWindow) {
      alert("Please allow popups to print the attendance report.");
      return;
    }

    const schoolTitleHindi = schoolInfo.schoolNameHindi || "कम्पोजिट विद्यालय चांदपुर तरहर";
    const schoolTitleEnglish = schoolInfo.schoolName || "Composite School Chandpur Tarhar";
    const blockDistrictText = `विकास खंड - ${schoolInfo.schoolBlock || "परसपुर"}, जनपद - ${schoolInfo.schoolDistrict || "गोंडा"} | यू-डायस कोड: ${schoolInfo.udiseCode || "09530607202"}`;

    const modeTitle =
      mode === "daily"
        ? "दैनिक छात्र-छात्रा उपस्थिति विवरण (Daily Register)"
        : mode === "weekly"
        ? "साप्ताहिक छात्र-छात्रा उपस्थिति विवरण (Weekly Register)"
        : "मासिक छात्र-छात्रा उपस्थिति विवरण (Monthly Register)";

    const isMultiDay = mode !== "daily";

    function generateHeaderHTML(sectionTitleHindi: string, sectionTitleEnglish: string) {
      return `
        <div class="print-header">
          <div class="school-hi">${schoolTitleHindi}</div>
          <div class="school-en">${schoolTitleEnglish}</div>
          <div class="school-meta">${blockDistrictText}</div>
          <div class="report-badge">${modeTitle}</div>
          <div class="report-section-title">${sectionTitleHindi} / ${sectionTitleEnglish}</div>
          <div class="period-text">अवधि / Period: <strong>${dateRangeLabel}</strong>${
        isMultiDay ? ` &nbsp;|&nbsp; कार्य दिवस / Working Days: <strong>${workingDays}</strong>` : ""
      }</div>
        </div>
      `;
    }

    function generateSignatureHTML() {
      return `
        <div class="sig-container">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">कक्षा अध्यापक हस्ताक्षर<br>(Class Teacher Signature)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">प्रधानाध्यापक हस्ताक्षर एवं मुहर<br>(Headmaster Signature & Seal)</div>
          </div>
        </div>
      `;
    }

    function generateTableHTML(
      sectionList: SectionAttendanceData[],
      agg: ReturnType<typeof aggregateGroup>
    ) {
      return `
        <table class="report-table">
          <thead>
            <tr>
              <th rowspan="2" class="col-class">कक्षा एवं वर्ग<br><span class="sub">Class & Sec</span></th>
              <th colspan="${isMultiDay ? "3" : "2"}" class="grp-boys">छात्र (बालक / Boys)</th>
              <th colspan="${isMultiDay ? "3" : "2"}" class="grp-girls">छात्रा (बालिका / Girls)</th>
              <th colspan="${isMultiDay ? "3" : "2"}" class="grp-total">कुल योग (Total)</th>
            </tr>
            <tr>
              <th class="grp-boys">नामांकन<br><span class="sub">Enrolled</span></th>
              <th class="grp-boys">उपस्थिति${isMultiDay ? "<br><span class='sub'>Total (Avg)</span>" : "<br><span class='sub'>Present</span>"}</th>
              <th class="grp-boys">%<br><span class="sub">Rate</span></th>

              <th class="grp-girls">नामांकन<br><span class="sub">Enrolled</span></th>
              <th class="grp-girls">उपस्थिति${isMultiDay ? "<br><span class='sub'>Total (Avg)</span>" : "<br><span class='sub'>Present</span>"}</th>
              <th class="grp-girls">%<br><span class="sub">Rate</span></th>

              <th class="grp-total">नामांकन<br><span class="sub">Enrolled</span></th>
              <th class="grp-total">उपस्थिति${isMultiDay ? "<br><span class='sub'>Total (Avg)</span>" : "<br><span class='sub'>Present</span>"}</th>
              <th class="grp-total">%<br><span class="sub">Rate</span></th>
            </tr>
          </thead>
          <tbody>
            ${
              sectionList.length === 0
                ? `<tr><td colspan="${isMultiDay ? 10 : 8}" style="text-align:center; padding:16px;">कोई डेटा उपलब्ध नहीं / No data</td></tr>`
                : sectionList
                    .map(
                      (s) => `
                <tr>
                  <td class="col-class font-bold">Class ${s.className} (${s.sectionName})</td>
                  <td>${s.totalBoys}</td>
                  <td><strong>${s.boysPresent}</strong>${isMultiDay && s.boysAvg ? ` <span class="avg-sub">(${s.boysAvg})</span>` : ""}</td>
                  <td>${s.boysPct}%</td>

                  <td>${s.totalGirls}</td>
                  <td><strong>${s.girlsPresent}</strong>${isMultiDay && s.girlsAvg ? ` <span class="avg-sub">(${s.girlsAvg})</span>` : ""}</td>
                  <td>${s.girlsPct}%</td>

                  <td><strong>${s.totalStudents}</strong></td>
                  <td><strong class="text-green">${s.totalPresent}</strong>${isMultiDay && s.totalAvg ? ` <span class="avg-sub">(${s.totalAvg})</span>` : ""}</td>
                  <td><strong>${s.totalPct}%</strong></td>
                </tr>
              `
                    )
                    .join("")
            }
            <tr class="row-subtotal">
              <td class="col-class"><strong>उप-योग / Sub-Total</strong></td>
              <td><strong>${agg.totalBoys}</strong></td>
              <td><strong>${agg.boysPresent}</strong>${isMultiDay ? ` <span class="avg-sub">(${agg.boysAvg})</span>` : ""}</td>
              <td><strong>${agg.boysPct}%</strong></td>

              <td><strong>${agg.totalGirls}</strong></td>
              <td><strong>${agg.girlsPresent}</strong>${isMultiDay ? ` <span class="avg-sub">(${agg.girlsAvg})</span>` : ""}</td>
              <td><strong>${agg.girlsPct}%</strong></td>

              <td><strong>${agg.totalStudents}</strong></td>
              <td><strong>${agg.totalPresent}</strong>${isMultiDay ? ` <span class="avg-sub">(${agg.totalAvg})</span>` : ""}</td>
              <td><strong>${agg.totalPct}%</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    }

    function generateGrandTotalHTML() {
      return `
        <div class="grand-block">
          <div class="grand-title">सम्पूर्ण विद्यालय सारांश / School Grand Total Summary</div>
          <table class="report-table grand-table">
            <thead>
              <tr>
                <th class="col-class">श्रेणी (Category)</th>
                <th>नामांकन (Enrolled)</th>
                <th>कुल उपस्थिति (Present)${isMultiDay ? " &nbsp;[औसत/दिन]" : ""}</th>
                <th>उपस्थिति प्रतिशत (Rate %)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="col-class font-bold">छात्र (बालक / Boys)</td>
                <td><strong>${grandAgg.totalBoys}</strong></td>
                <td><strong>${grandAgg.boysPresent}</strong>${isMultiDay ? ` &nbsp;[${grandAgg.boysAvg} / day]` : ""}</td>
                <td><strong>${grandAgg.boysPct}%</strong></td>
              </tr>
              <tr>
                <td class="col-class font-bold">छात्रा (बालिका / Girls)</td>
                <td><strong>${grandAgg.totalGirls}</strong></td>
                <td><strong>${grandAgg.girlsPresent}</strong>${isMultiDay ? ` &nbsp;[${grandAgg.girlsAvg} / day]` : ""}</td>
                <td><strong>${grandAgg.girlsPct}%</strong></td>
              </tr>
              <tr class="row-grand">
                <td class="col-class"><strong>महा-योग / Grand Total</strong></td>
                <td><strong>${grandAgg.totalStudents}</strong></td>
                <td><strong class="text-green">${grandAgg.totalPresent}</strong>${isMultiDay ? ` &nbsp;[${grandAgg.totalAvg} / day]` : ""}</td>
                <td><strong>${grandAgg.totalPct}%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    let bodyHTML = "";

    if (target === "all" || target === "primary") {
      bodyHTML += `
        <div class="print-page ${target === "all" ? "page-break" : ""}">
          ${generateHeaderHTML("प्राथमिक विभाग (कक्षा 1 से 5)", "Primary Section (Classes 1–5)")}
          ${generateTableHTML(primarySections, primaryAgg)}
          ${generateSignatureHTML()}
        </div>
      `;
    }

    if (target === "all" || target === "junior") {
      bodyHTML += `
        <div class="print-page">
          ${generateHeaderHTML("उच्च प्राथमिक / जूनियर विभाग (कक्षा 6 से 8)", "Junior Section (Classes 6–8)")}
          ${generateTableHTML(juniorSections, juniorAgg)}
          ${generateGrandTotalHTML()}
          ${generateSignatureHTML()}
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="hi">
        <head>
          <meta charset="utf-8" />
          <title>${schoolTitleEnglish} — Attendance Register (${mode})</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: "Times New Roman", Georgia, serif;
              font-size: 11px;
              color: #111;
              background: #fff;
              padding: 12px;
            }
            .print-page {
              padding: 12px;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .print-header {
              text-align: center;
              margin-bottom: 12px;
              border-bottom: 2px solid #222;
              padding-bottom: 8px;
            }
            .school-hi {
              font-size: 18px;
              font-weight: bold;
              color: #6B1D30;
              line-height: 1.2;
            }
            .school-en {
              font-size: 14px;
              font-weight: bold;
              color: #222;
              margin-top: 2px;
              letter-spacing: 0.5px;
            }
            .school-meta {
              font-size: 10px;
              color: #555;
              margin-top: 3px;
            }
            .report-badge {
              display: inline-block;
              margin-top: 6px;
              padding: 2px 10px;
              background: #f4ede4;
              border: 1px solid #c2b5a5;
              font-size: 11px;
              font-weight: bold;
              color: #6B1D30;
              text-transform: uppercase;
            }
            .report-section-title {
              font-size: 13px;
              font-weight: bold;
              margin-top: 6px;
              color: #111;
            }
            .period-text {
              font-size: 10.5px;
              color: #333;
              margin-top: 3px;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 10px;
            }
            .report-table th, .report-table td {
              border: 1px solid #444;
              padding: 5px 6px;
              text-align: center;
              vertical-align: middle;
            }
            .report-table thead th {
              background: #eae4dc;
              color: #222;
              font-weight: bold;
              font-size: 9.5px;
              line-height: 1.2;
            }
            .sub {
              font-size: 8px;
              font-weight: normal;
              color: #555;
            }
            .avg-sub {
              font-size: 8.5px;
              font-weight: normal;
              color: #444;
            }
            .col-class {
              text-align: left !important;
              padding-left: 8px !important;
            }
            .grp-boys {
              background: #ebf3fb !important;
              color: #1e3a8a;
            }
            .grp-girls {
              background: #fdf2f8 !important;
              color: #9d174d;
            }
            .grp-total {
              background: #f0fdf4 !important;
              color: #14532d;
            }
            .row-subtotal td {
              background: #f1ede5 !important;
              font-weight: bold;
              border-top: 2px solid #222;
              border-bottom: 2px solid #222;
            }
            .grand-block {
              margin-top: 14px;
              page-break-inside: avoid;
            }
            .grand-title {
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              padding: 4px;
              background: #e4ddd3;
              border: 1px solid #444;
              border-bottom: none;
            }
            .grand-table {
              margin-top: 0;
            }
            .row-grand td {
              background: #e2e8f0 !important;
              font-weight: bold;
              border-top: 2px solid #222;
              border-bottom: 2px solid #222;
              font-size: 10.5px;
            }
            .text-green {
              color: #15803d;
            }
            .sig-container {
              display: flex;
              justify-content: space-between;
              margin-top: 45px;
              padding: 0 30px;
              page-break-inside: avoid;
            }
            .sig-box {
              text-align: center;
              width: 200px;
            }
            .sig-line {
              border-top: 1px dashed #222;
              margin-bottom: 6px;
            }
            .sig-label {
              font-size: 9.5px;
              font-weight: bold;
              color: #333;
              line-height: 1.3;
            }
            @media print {
              body {
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-page {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${bodyHTML}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Filter on-screen if user chose a specific class
  const filteredSections =
    selectedSectionFilter === "ALL"
      ? sections
      : selectedSectionFilter === "PRIMARY"
      ? primarySections
      : selectedSectionFilter === "JUNIOR"
      ? juniorSections
      : sections.filter(
          (s) => `Class ${s.className} (${s.sectionName})` === selectedSectionFilter
        );

  const displayPrimary = filteredSections.filter((s) => isPrimary(s.className));
  const displayJunior = filteredSections.filter((s) => !isPrimary(s.className));

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* ── Control Bar ── */}
      <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Selector & Date */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Segmented Control */}
            <div className="flex items-center bg-[#F3EDE4] p-1 rounded-sm border border-[#E8E0D4]">
              <button
                type="button"
                onClick={() => handleModeChange("daily")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                  mode === "daily"
                    ? "bg-[#6B1D30] text-white shadow-xs"
                    : "text-[#7A7267] hover:text-[#2D2A26]"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Daily / दैनिक</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("weekly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                  mode === "weekly"
                    ? "bg-[#6B1D30] text-white shadow-xs"
                    : "text-[#7A7267] hover:text-[#2D2A26]"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Weekly / साप्ताहिक</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("monthly")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                  mode === "monthly"
                    ? "bg-[#6B1D30] text-white shadow-xs"
                    : "text-[#7A7267] hover:text-[#2D2A26]"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                <span>Monthly / मासिक</span>
              </button>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => {
                  setDateInput(e.target.value);
                  handleDateApply(e.target.value);
                }}
                className="border border-[#D1C7B7] bg-white rounded-sm px-3 py-1.5 text-xs font-medium text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
              />
            </div>

            {/* Class Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#7A7267]" />
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="border border-[#D1C7B7] bg-white rounded-sm px-2.5 py-1.5 text-xs text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#6B1D30]"
              >
                <option value="ALL">All Sections (सभी कक्षाएं)</option>
                <option value="PRIMARY">Primary Only (Classes 1–5)</option>
                <option value="JUNIOR">Junior Only (Classes 6–8)</option>
                {sections.map((s) => (
                  <option
                    key={`${s.className}-${s.sectionName}`}
                    value={`Class ${s.className} (${s.sectionName})`}
                  >
                    Class {s.className} ({s.sectionName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Print Buttons Group */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint("primary")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6B1D30] bg-white border border-[#6B1D30]/40 rounded-sm hover:bg-[#6B1D30]/5 transition-colors"
              title="Print Primary section only (Classes 1 to 5)"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Primary (1–5)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint("junior")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1e3a8a] bg-white border border-blue-400 rounded-sm hover:bg-blue-50 transition-colors"
              title="Print Junior section only (Classes 6 to 8)"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Junior (6–8)</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint("all")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-sm shadow-xs transition-colors hover:brightness-110"
              style={{ background: "#6B1D30" }}
              title="Print complete report with Primary on Page 1 and Junior on Page 2"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print All (Pages 1 &amp; 2)</span>
            </button>
          </div>
        </div>

        {/* Informational Sub-bar */}
        <div className="mt-3 pt-3 border-t border-[#F3EDE4] flex flex-wrap items-center justify-between text-xs text-[#7A7267] gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-[#2D2A26] font-bold">{dateRangeLabel}</span>
            {mode !== "daily" && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-semibold">
                {workingDays} कार्य दिवस (Working Days marked)
              </span>
            )}
          </div>
          <div className="text-[11px] text-[#A89F91]">
            {schoolInfo.schoolNameHindi || "कम्पोजिट विद्यालय चांदपुर तरहर"} · {schoolInfo.registerSubtitle || "आधिकारिक छात्र-छात्रा उपस्थिति पंजीका"}
          </div>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Boys Card */}
        <div className="bg-white border border-blue-100 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              छात्र (बालक / Boys)
            </p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              {grandAgg.boysPct}% Attendance
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-950">{grandAgg.boysPresent}</span>
            <span className="text-xs text-blue-600">
              उपस्थित / {grandAgg.totalBoys} कुल छात्र
            </span>
          </div>
          {mode !== "daily" && (
            <p className="text-[11px] text-blue-500 mt-1">
              औसत: <strong>{grandAgg.boysAvg}</strong> बालक / दिन
            </p>
          )}
        </div>

        {/* Girls Card */}
        <div className="bg-white border border-pink-100 rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-pink-900 uppercase tracking-wider">
              छात्रा (बालिका / Girls)
            </p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-pink-50 text-pink-700">
              {grandAgg.girlsPct}% Attendance
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-pink-950">{grandAgg.girlsPresent}</span>
            <span className="text-xs text-pink-600">
              उपस्थित / {grandAgg.totalGirls} कुल छात्रा
            </span>
          </div>
          {mode !== "daily" && (
            <p className="text-[11px] text-pink-500 mt-1">
              औसत: <strong>{grandAgg.girlsAvg}</strong> बालिका / दिन
            </p>
          )}
        </div>

        {/* Grand Total Card */}
        <div className="bg-white border border-[#E8E0D4] rounded-sm p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#6B1D30] uppercase tracking-wider">
              सम्पूर्ण विद्यालय (Total)
            </p>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#6B1D30]/10 text-[#6B1D30]">
              {grandAgg.totalPct}% Overall
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#2D2A26]">{grandAgg.totalPresent}</span>
            <span className="text-xs text-[#7A7267]">
              उपस्थित / {grandAgg.totalStudents} कुल नामांकन
            </span>
          </div>
          {mode !== "daily" && (
            <p className="text-[11px] text-[#7A7267] mt-1">
              औसत: <strong>{grandAgg.totalAvg}</strong> विद्यार्थी / दिन
            </p>
          )}
        </div>
      </div>

      {/* ── Primary Section Table (Classes 1–5) ── */}
      {displayPrimary.length > 0 && (
        <div className="bg-white border border-[#E8E0D4] rounded-sm overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-[#6B1D30] text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">
                प्राथमिक विभाग / Primary Section (Classes 1–5)
              </h2>
              <p className="text-[11px] text-white/80">
                कक्षा 1 से 5 का लिंग-वार (छात्र-छात्रा) उपस्थिति विवरण
              </p>
            </div>
            <button
              onClick={() => handlePrint("primary")}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Printer className="h-3 w-3" />
              <span>Print Primary</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E8E0D4] text-[#2D2A26] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">कक्षा एवं वर्ग (Class)</th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900 border-l border-blue-100">
                    बालक नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900">
                    उपस्थिति {mode !== "daily" ? "(औसत)" : ""}
                  </th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900">
                    बालक %
                  </th>

                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900 border-l border-pink-100">
                    बालिका नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900">
                    उपस्थिति {mode !== "daily" ? "(औसत)" : ""}
                  </th>
                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900">
                    बालिका %
                  </th>

                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950 border-l border-emerald-100">
                    कुल नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950">
                    कुल उपस्थिति
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950">
                    कुल %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D4]">
                {displayPrimary.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#2D2A26]">
                      Class {s.className} ({s.sectionName})
                    </td>

                    {/* Boys */}
                    <td className="py-2.5 px-2 text-center font-medium text-blue-950 border-l border-blue-50">
                      {s.totalBoys}
                    </td>
                    <td className="py-2.5 px-2 text-center text-blue-800 font-semibold">
                      {s.boysPresent}
                      {mode !== "daily" && s.boysAvg && (
                        <span className="text-[10px] text-blue-600 block">({s.boysAvg}/दिन)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                      {s.boysPct}%
                    </td>

                    {/* Girls */}
                    <td className="py-2.5 px-2 text-center font-medium text-pink-950 border-l border-pink-50">
                      {s.totalGirls}
                    </td>
                    <td className="py-2.5 px-2 text-center text-pink-800 font-semibold">
                      {s.girlsPresent}
                      {mode !== "daily" && s.girlsAvg && (
                        <span className="text-[10px] text-pink-600 block">({s.girlsAvg}/दिन)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-pink-700">
                      {s.girlsPct}%
                    </td>

                    {/* Total */}
                    <td className="py-2.5 px-2 text-center font-bold text-[#2D2A26] border-l border-emerald-50">
                      {s.totalStudents}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                      {s.totalPresent}
                      {mode !== "daily" && s.totalAvg && (
                        <span className="text-[10px] text-emerald-600 block font-normal">
                          ({s.totalAvg}/दिन)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          s.totalPct >= 75
                            ? "bg-green-100 text-green-800"
                            : s.totalPct >= 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.totalPct}%
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Sub-total */}
                <tr className="bg-[#F3EDE4] font-bold border-t-2 border-[#D1C7B7]">
                  <td className="py-2.5 px-3 text-[#2D2A26]">उप-योग / Primary Total</td>
                  <td className="py-2.5 px-2 text-center text-blue-950 border-l border-blue-100">
                    {primaryAgg.totalBoys}
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-800">
                    {primaryAgg.boysPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-blue-700 block">({primaryAgg.boysAvg}/दिन)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-700">
                    {primaryAgg.boysPct}%
                  </td>

                  <td className="py-2.5 px-2 text-center text-pink-950 border-l border-pink-100">
                    {primaryAgg.totalGirls}
                  </td>
                  <td className="py-2.5 px-2 text-center text-pink-800">
                    {primaryAgg.girlsPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-pink-700 block">({primaryAgg.girlsAvg}/दिन)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-pink-700">
                    {primaryAgg.girlsPct}%
                  </td>

                  <td className="py-2.5 px-2 text-center text-[#2D2A26] border-l border-emerald-100">
                    {primaryAgg.totalStudents}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-800">
                    {primaryAgg.totalPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-emerald-700 block font-normal">
                        ({primaryAgg.totalAvg}/दिन)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-800">
                    {primaryAgg.totalPct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Junior Section Table (Classes 6–8) ── */}
      {displayJunior.length > 0 && (
        <div className="bg-white border border-[#E8E0D4] rounded-sm overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-[#1e3a8a] text-white flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">
                उच्च प्राथमिक / जूनियर विभाग / Junior Section (Classes 6–8)
              </h2>
              <p className="text-[11px] text-white/80">
                कक्षा 6 से 8 का लिंग-वार (छात्र-छात्रा) उपस्थिति विवरण
              </p>
            </div>
            <button
              onClick={() => handlePrint("junior")}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded transition-colors flex items-center gap-1"
            >
              <Printer className="h-3 w-3" />
              <span>Print Junior</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E8E0D4] text-[#2D2A26] font-semibold text-[11px]">
                  <th className="py-2.5 px-3">कक्षा एवं वर्ग (Class)</th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900 border-l border-blue-100">
                    बालक नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900">
                    उपस्थिति {mode !== "daily" ? "(औसत)" : ""}
                  </th>
                  <th className="py-2.5 px-2 text-center bg-blue-50/70 text-blue-900">
                    बालक %
                  </th>

                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900 border-l border-pink-100">
                    बालिका नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900">
                    उपस्थिति {mode !== "daily" ? "(औसत)" : ""}
                  </th>
                  <th className="py-2.5 px-2 text-center bg-pink-50/70 text-pink-900">
                    बालिका %
                  </th>

                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950 border-l border-emerald-100">
                    कुल नामांकन
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950">
                    कुल उपस्थिति
                  </th>
                  <th className="py-2.5 px-2 text-center bg-emerald-50/50 text-emerald-950">
                    कुल %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E0D4]">
                {displayJunior.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#2D2A26]">
                      Class {s.className} ({s.sectionName})
                    </td>

                    {/* Boys */}
                    <td className="py-2.5 px-2 text-center font-medium text-blue-950 border-l border-blue-50">
                      {s.totalBoys}
                    </td>
                    <td className="py-2.5 px-2 text-center text-blue-800 font-semibold">
                      {s.boysPresent}
                      {mode !== "daily" && s.boysAvg && (
                        <span className="text-[10px] text-blue-600 block">({s.boysAvg}/दिन)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                      {s.boysPct}%
                    </td>

                    {/* Girls */}
                    <td className="py-2.5 px-2 text-center font-medium text-pink-950 border-l border-pink-50">
                      {s.totalGirls}
                    </td>
                    <td className="py-2.5 px-2 text-center text-pink-800 font-semibold">
                      {s.girlsPresent}
                      {mode !== "daily" && s.girlsAvg && (
                        <span className="text-[10px] text-pink-600 block">({s.girlsAvg}/दिन)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-pink-700">
                      {s.girlsPct}%
                    </td>

                    {/* Total */}
                    <td className="py-2.5 px-2 text-center font-bold text-[#2D2A26] border-l border-emerald-50">
                      {s.totalStudents}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                      {s.totalPresent}
                      {mode !== "daily" && s.totalAvg && (
                        <span className="text-[10px] text-emerald-600 block font-normal">
                          ({s.totalAvg}/दिन)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          s.totalPct >= 75
                            ? "bg-green-100 text-green-800"
                            : s.totalPct >= 50
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.totalPct}%
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Sub-total */}
                <tr className="bg-[#F3EDE4] font-bold border-t-2 border-[#D1C7B7]">
                  <td className="py-2.5 px-3 text-[#2D2A26]">उप-योग / Junior Total</td>
                  <td className="py-2.5 px-2 text-center text-blue-950 border-l border-blue-100">
                    {juniorAgg.totalBoys}
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-800">
                    {juniorAgg.boysPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-blue-700 block">({juniorAgg.boysAvg}/दिन)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-700">
                    {juniorAgg.boysPct}%
                  </td>

                  <td className="py-2.5 px-2 text-center text-pink-950 border-l border-pink-100">
                    {juniorAgg.totalGirls}
                  </td>
                  <td className="py-2.5 px-2 text-center text-pink-800">
                    {juniorAgg.girlsPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-pink-700 block">({juniorAgg.girlsAvg}/दिन)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-pink-700">
                    {juniorAgg.girlsPct}%
                  </td>

                  <td className="py-2.5 px-2 text-center text-[#2D2A26] border-l border-emerald-100">
                    {juniorAgg.totalStudents}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-800">
                    {juniorAgg.totalPresent}
                    {mode !== "daily" && (
                      <span className="text-[10px] text-emerald-700 block font-normal">
                        ({juniorAgg.totalAvg}/दिन)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-emerald-800">
                    {juniorAgg.totalPct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
