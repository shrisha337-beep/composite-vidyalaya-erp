"use client";

import { useState } from "react";
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

export function TcForm({
  locale,
  student,
  decrypted,
}: {
  locale: string;
  student: any;
  decrypted: any;
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [isEnrolled, setIsEnrolled] = useState(true);
  const [reasonForLeaving, setReasonForLeaving] = useState("");

  return (
    <form action={issueTransferCertificate} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="studentId" value={student.id} />

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── SECTION 1: BOOK & SERIAL NUMBERS ──────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Book & Serial Details / पुस्तक एवं क्रम संख्या
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Book Number"
            labelHi="बुक नम्बर"
            name="bookNumber"
            placeholder="e.g. 12"
          />
          <Field
            label="Serial Number (TC No)"
            labelHi="क्रम संख्या"
            name="tcNumber"
            required
            placeholder="e.g. 34"
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
            defaultValue={student.developmentBlock || "Tarhar"}
          />
          <Field
            label="School District"
            labelHi="जनपद"
            name="schoolDistrict"
            defaultValue={student.district || "Maharajganj"}
          />
        </div>
      </div>

      {/* ── SECTION 3: REASON & CONDUCT ───────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Striking Off & Leaving Info / विवरण नाम काटने का
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field
            label="Reason for Striking Off"
            labelHi="नाम काटने का कारण"
            name="strikingReason"
            placeholder="e.g. Guardians relocated / अभिभावक के स्थानान्तरण के कारण"
          />
          <Field
            label="Reason for Leaving (Schema Match)"
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

      {/* ── SECTION 4: CLASS & PROMOTION ──────────────────────────────────── */}
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

      {/* ── SECTION 5: WORKING DAYS & DATES ───────────────────────────────── */}
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

      {/* ── SECTION 6: REMARKS ────────────────────────────────────────────── */}
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
