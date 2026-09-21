"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { issueTransferCertificate } from "@/app/actions/issue-tc";
import Link from "next/link";

function Field({
  label,
  labelHi,
  name,
  required,
  type = "text",
  placeholder,
  defaultValue,
  className,
  children,
}: {
  label: string;
  labelHi?: string;
  name?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {labelHi && (
          <span className="text-gray-400 font-normal ml-1">({labelHi})</span>
        )}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children ?? (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] focus:border-transparent bg-white"
        />
      )}
    </div>
  );
}

// ── DOB to words converter (Hindi + English) ────────────────────────────────

const hindiDigitWords = [
  "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
  "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
  "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अठ्ठाईस", "उनतीस", "तीस",
  "इकतीस",
];

const hindiMonths = [
  "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितम्बर", "अक्टूबर", "नवम्बर", "दिसम्बर",
];

const englishMonths = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const englishOnes = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const englishTens = ["", "", "Twenty", "Thirty"];

function numberToEnglish(n: number): string {
  if (n < 20) return englishOnes[n];
  if (n < 40) return englishTens[Math.floor(n / 10)] + (n % 10 ? " " + englishOnes[n % 10] : "");
  return String(n);
}

function yearToHindi(year: number): string {
  if (year < 2000) {
    return `उन्नीस सौ ${hindiDigitWords[year - 1900] || year - 1900}`;
  }
  const remainder = year - 2000;
  if (remainder === 0) return "दो हज़ार";
  if (remainder <= 31) return `दो हज़ार ${hindiDigitWords[remainder]}`;
  return `दो हज़ार ${hindiDigitWords[Math.floor(remainder / 10) * 10] || ""} ${hindiDigitWords[remainder % 10] || ""}`.trim();
}

function yearToEnglish(year: number): string {
  if (year < 2000) {
    return `Nineteen ${numberToEnglish(year - 1900)}`;
  }
  const remainder = year - 2000;
  if (remainder === 0) return "Two Thousand";
  return `Two Thousand ${numberToEnglish(remainder)}`;
}

function dobToWords(dob: Date): string {
  const day = dob.getDate();
  const month = dob.getMonth();
  const year = dob.getFullYear();

  const hindi = `${hindiDigitWords[day]} ${hindiMonths[month]} ${yearToHindi(year)}`;
  const english = `${numberToEnglish(day)} ${englishMonths[month]} ${yearToEnglish(year)}`;

  return `${hindi} (${english})`;
}

// ── Main form component ─────────────────────────────────────────────────────

export function TcForm({
  locale,
  student,
  decrypted,
  nextTcNumber,
}: {
  locale: string;
  student: any;
  decrypted: any;
  nextTcNumber: string;
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [reasonForLeaving, setReasonForLeaving] = useState("");

  // Auto-compute DOB in words from student's DOB
  const studentDob = student.dob ? new Date(student.dob) : null;
  const autoDobWords = studentDob ? dobToWords(studentDob) : "";
  const [dobInWords, setDobInWords] = useState(student.dobInWords || autoDobWords);

  // If student has DOB but no existing dobInWords, auto-fill
  useEffect(() => {
    if (!dobInWords && autoDobWords) {
      setDobInWords(autoDobWords);
    }
  }, []);

  return (
    <form action={issueTransferCertificate} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="studentId" value={student.id} />

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── SECTION 1: SERIAL NUMBER ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Serial Number / क्रम संख्या
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Serial Number (TC No)"
            labelHi="क्रम संख्या"
            name="tcNumber"
            required
            defaultValue={nextTcNumber}
          />
        </div>
      </div>

      {/* ── SECTION 2: SCHOOL & LOCATION snapshot info ───────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          School Context / विद्यालय विवरण
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="School Block"
            labelHi="विकास खण्ड"
            name="schoolBlock"
            defaultValue="Paraspur"
          />
          <Field
            label="School District"
            labelHi="जनपद"
            name="schoolDistrict"
            defaultValue="Gonda"
          />
        </div>
      </div>

      {/* ── SECTION 3: DOB IN WORDS (auto-extracted, required) ────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Date of Birth in Words / जन्मतिथि शब्दों में
        </h2>
        <Field
          label="DOB in Words"
          labelHi="जन्मतिथि शब्दों में"
          name="dobInWords"
          required
        >
          <input
            name="dobInWords"
            type="text"
            required
            value={dobInWords}
            onChange={(e) => setDobInWords(e.target.value)}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] focus:border-transparent bg-white"
          />
          {autoDobWords && (
            <p className="text-[11px] text-gray-400 mt-1">
              Auto-extracted from DOB: {studentDob?.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </p>
          )}
        </Field>
      </div>

      {/* ── SECTION 4: REASON & CONDUCT ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Leaving Info / विवरण
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field
            label="Reason for Leaving"
            labelHi="विद्यालय छोड़ने का कारण"
            name="reasonForLeaving"
            required
          >
            <select
              name="reasonForLeaving"
              required
              value={reasonForLeaving}
              onChange={(e) => setReasonForLeaving(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] focus:border-transparent bg-white"
            >
              <option value="">-- Select / चुनें --</option>
              <option value="कक्षा 8 उत्तीर्ण / Passed 8th">कक्षा 8 उत्तीर्ण / Passed 8th</option>
              <option value="अभिभावक इच्छा / Guardian's Will">अभिभावक इच्छा / Guardian&apos;s Will</option>
              <option value="प्रवास / Migrate">प्रवास / Migrate</option>
              <option value="__OTHER__">अन्य / Other</option>
            </select>
          </Field>
          {reasonForLeaving === "__OTHER__" && (
            <Field
              label="Specify Other Reason"
              labelHi="अन्य कारण लिखें"
              name="reasonForLeavingOther"
              required
              placeholder="Enter reason / कारण लिखें"
              className="sm:col-span-2"
            />
          )}
          <Field
            label="Conduct"
            labelHi="आचरण"
            name="conduct"
            defaultValue="Good / उत्तम"
          />
          <Field
            label="Student Medium/Language"
            labelHi="विद्यार्थी की भाषा"
            name="studentMedium"
            defaultValue="Hindi / हिन्दी"
          />
        </div>
      </div>

      {/* ── SECTION 5: CLASS & PROMOTION ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Class & Promotion Details / कक्षा एवं प्रोन्नति
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field
            label="Last Class Studied"
            labelHi="अथवा कक्षा जिससे नाम कटा"
            name="lastClassStudied"
            required
            defaultValue={student.section?.class?.name ? `Class ${student.section.class.name}` : ""}
          />
          <Field
            label="Higher Exam Passed Name"
            labelHi="नाम उच्च परीक्षा जो उत्तीर्ण की"
            name="passedHigherExam"
            placeholder="e.g. Class 5 / कक्षा 5"
          />
          <Field
            label="Higher Exam Date of Passing"
            labelHi="उत्तीर्ण तिथि"
            name="passedHigherExamDate"
            type="date"
          />
          <Field
            label="Promoted To Class"
            labelHi="अगली कक्षा हेतु प्रोन्नत"
            name="promotedToClass"
            placeholder="e.g. Class 6 / कक्षा 6"
          />
        </div>
      </div>

      {/* ── SECTION 6: WORKING DAYS & DATES ───────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Attendance & Dates / उपस्थिति एवं दिनांक
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Total School Working Days"
            labelHi="स्कूल खुलने के दिन"
            name="schoolWorkingDays"
            type="number"
            defaultValue={210}
          />
          <Field
            label="Student Days Present"
            labelHi="विद्यार्थी की उपस्थिति"
            name="studentWorkingDays"
            type="number"
            defaultValue={180}
          />
          <Field
            label="Class Admission/Start Date"
            labelHi="कक्षा निर्धारित तिथि से"
            name="classStartDate"
            type="date"
          />
          <Field
            label="Date of Leaving"
            labelHi="नाम काटने का दिनांक"
            name="dateOfLeaving"
            required
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
          <Field
            label="Date of Issue"
            labelHi="जारी करने का दिनांक"
            name="dateOfIssue"
            required
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      {/* ── SECTION 7: REMARKS ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Remarks / टिप्पणी
        </h2>
        <Field
          label="Remarks"
          labelHi="टिप्पणी"
          name="remarks"
          placeholder="Enter additional remarks"
        />
      </div>

      {/* ── SUBMIT & CANCEL ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-md text-sm font-medium text-white transition-colors"
          style={{ background: "hsl(var(--primary))" }}
        >
          Issue & Inactivate Student / टीसी जारी करें
        </button>
        <Link
          href={`/${locale}/admin/students/${student.id}`}
          className="px-4 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel / निरस्त करें
        </Link>
      </div>
    </form>
  );
}
