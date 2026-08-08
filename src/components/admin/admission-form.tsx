"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createStudent } from "@/app/actions/create-student";
import { updateStudent } from "@/app/actions/update-student";
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";

// ── Small reusable field components ──────────────────────────────────────────

function Field({
  label,
  labelHi,
  name,
  required,
  type = "text",
  placeholder,
  children,
  className,
  defaultValue,
}: {
  label: string;
  labelHi?: string;
  name?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string;
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full">
      <h2 className="text-sm font-semibold text-white px-3 py-1.5 rounded"
        style={{ background: "hsl(var(--primary))" }}>
        {children}
      </h2>
    </div>
  );
}

// ── File upload field ─────────────────────────────────────────────────────────

function FileField({
  label,
  labelHi,
  name,
}: {
  label: string;
  labelHi?: string;
  name: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {labelHi && (
          <span className="text-gray-400 font-normal ml-1">({labelHi})</span>
        )}
      </label>
      <input
        ref={ref}
        type="file"
        name={name}
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400 hover:bg-gray-50 w-full"
      >
        <Upload className="h-3.5 w-3.5 shrink-0" />
        {fileName ? (
          <span className="truncate text-gray-700">{fileName}</span>
        ) : (
          <span>Choose file (image or PDF)</span>
        )}
      </button>
    </div>
  );
}

// ── Sibling row ───────────────────────────────────────────────────────────────

interface SiblingRow {
  id: number;
  isEnrolled: boolean;
  fullName?: string;
  relation?: "BROTHER" | "SISTER";
  dob?: string;
  enrolledSchoolName?: string;
  reasonNotEnrolled?: string;
}

// ── Main form component ───────────────────────────────────────────────────────

export function AdmissionForm({
  locale,
  sessionLabel,
  schoolDistrict,
  schoolBlock,
  isEdit = false,
  student,
  decrypted,
}: {
  locale: string;
  sessionLabel: string;
  schoolDistrict?: string;
  schoolBlock?: string;
  isEdit?: boolean;
  student?: any;
  decrypted?: any;
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [siblings, setSiblings] = useState<SiblingRow[]>(() => {
    if (student?.siblings) {
      return student.siblings.map((sib: any, idx: number) => ({
        id: idx,
        isEnrolled: sib.isEnrolled,
        fullName: sib.fullName,
        relation: sib.relation,
        dob: sib.dob ? new Date(sib.dob).toISOString().split("T")[0] : "",
        enrolledSchoolName: sib.enrolledSchoolName || "",
        reasonNotEnrolled: sib.reasonNotEnrolled || "",
      }));
    }
    return [];
  });
  const nextSibId = useRef(student?.siblings?.length ?? 0);

  function addSibling() {
    setSiblings((prev) => [...prev, { id: nextSibId.current++, isEnrolled: true }]);
  }

  function removeSibling(id: number) {
    setSiblings((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleEnrolled(id: number, val: boolean) {
    setSiblings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnrolled: val } : s))
    );
  }

  const father = decrypted?.guardians?.find((g: any) => g.relation === "FATHER") || student?.guardians?.find((g: any) => g.relation === "FATHER");
  const mother = decrypted?.guardians?.find((g: any) => g.relation === "MOTHER") || student?.guardians?.find((g: any) => g.relation === "MOTHER");
  const guardian = decrypted?.guardians?.find((g: any) => g.relation === "GUARDIAN") || student?.guardians?.find((g: any) => g.relation === "GUARDIAN");

  return (
    <form action={isEdit ? updateStudent : createStudent}>
      {isEdit && (
        <>
          <input type="hidden" name="studentId" value={student.id} />
          <input type="hidden" name="userId" value={student.userId} />
        </>
      )}
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="siblingCount" value={siblings.length} />

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── HEADER INFO ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              विद्यालय में प्रवेश हेतु पंजीकरण फार्म
            </p>
            <p className="text-xs text-gray-400">
              शैक्षिक सत्र: <span className="font-medium text-gray-600">{sessionLabel}</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              नोट: सभी विवरण आधार कार्ड के अनुसार भरें
            </p>
          </div>

          {/* Photo upload box */}
          <div className="flex flex-col items-center gap-1">
            <FileField
              label="बालक/बालिका की पासपोर्ट फोटो"
              name="file_studentPhoto"
            />
            <p className="text-[10px] text-gray-400">Student Photo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="School Name" labelHi="विद्यालय का नाम" name="schoolName">
            <input
              name="schoolName"
              type="text"
              defaultValue="Composite Vidyalaya Chandpur Tarhar"
              readOnly
              className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm bg-gray-50 text-gray-600"
            />
          </Field>
          <Field label="Block" labelHi="विकासखण्ड" name="block">
            <input
              name="block"
              type="text"
              defaultValue={schoolBlock ?? ""}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </Field>
          <Field label="District" labelHi="जनपद" name="headerDistrict">
            <input
              name="headerDistrict"
              type="text"
              defaultValue={schoolDistrict ?? ""}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </Field>
        </div>
      </div>

      {/* ── SECTION 1: STUDENT & PARENT DETAILS ────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">

          {/* Student */}
          <Field label="Student Name" labelHi="छात्र/छात्रा का नाम" name="fullName" required defaultValue={student?.fullName} />
          <Field label="Student Aadhaar No." labelHi="आधार नंबर" name="studentAadhaar" defaultValue={decrypted?.studentAadhaar || ""} />

          {/* Father */}
          <Field label="Father's Name" labelHi="पिता का नाम श्री" name="fatherName" required defaultValue={father?.fullName} />
          <Field label="Father's Aadhaar No." labelHi="आधार नंबर" name="fatherAadhaar" defaultValue={father?.aadhaarNumber || ""} />

          {/* Mother */}
          <Field label="Mother's Name" labelHi="माता का नाम श्रीमती" name="motherName" defaultValue={mother?.fullName} />
          <Field label="Mother's Aadhaar No." labelHi="आधार नंबर" name="motherAadhaar" defaultValue={mother?.aadhaarNumber || ""} />

          {/* Guardian */}
          <Field label="Guardian's Name" labelHi="अभिभावक का नाम" name="guardianName" defaultValue={guardian?.fullName} />
          <Field label="Guardian's Aadhaar No." labelHi="आधार नंबर" name="guardianAadhaar" defaultValue={guardian?.aadhaarNumber || ""} />

          {/* Occupation + Caste row */}
          <Field label="Father/Guardian's Occupation" labelHi="पिता/अभिभावक का व्यवसाय" name="occupation" defaultValue={father?.occupation || ""} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Caste" labelHi="जाति" name="category" defaultValue={student?.category || ""} />
            <Field label="Sub-caste" labelHi="उपजाति" name="subCaste" defaultValue={student?.subCaste || ""} />
            <Field label="Religion" labelHi="धर्म" name="religion" defaultValue={student?.religion || ""} />
          </div>

          {/* DOB */}
          <Field label="Date of Birth (numbers)" labelHi="जन्मतिथि (अंकों में)" name="dob" type="date" required defaultValue={student?.dob ? new Date(student.dob).toISOString().split("T")[0] : ""} />
          <Field label="Date of Birth (in words)" labelHi="शब्दों में" name="dobInWords" placeholder="e.g. Fifteen August Two Thousand Fourteen" defaultValue={student?.dobInWords || ""} />

          {/* Age (display only, calculated) + Gender */}
          <Field label="Gender" labelHi="लिंग" name="gender" required>
            <select
              name="gender"
              required
              defaultValue={student?.gender || ""}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select</option>
              <option value="MALE">Male / पुरुष</option>
              <option value="FEMALE">Female / महिला</option>
              <option value="OTHER">Other / अन्य</option>
            </select>
          </Field>
          <Field label="Class for Admission" labelHi="कक्षा जिसमें प्रवेश चाहिए" name="classNumber" required>
            <select
              name="classNumber"
              required
              defaultValue={student?.section?.class?.name || ""}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select class</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={String(n)}>Class {n}</option>
              ))}
            </select>
          </Field>

          {/* Admission No + Ration Card */}
          <Field label="Admission Number" labelHi="पंजीयन क्रमांक" name="admissionNo" required placeholder="Enter admission number" defaultValue={student?.admissionNo || ""} />
          <Field label="Ration Card Type" labelHi="राशन कार्ड का प्रकार">
            <select
              name="rationCardType"
              defaultValue={student?.rationCardType || ""}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="">Select</option>
              <option value="APL">APL</option>
              <option value="BPL">BPL</option>
              <option value="ANTYODAYA">ANTYODAYA</option>
            </select>
          </Field>

          {/* Divider line */}
          <div className="col-span-full border-t border-gray-100 my-1" />

          {/* Previous school */}
          <Field label="Previously Passed Class" labelHi="पूर्व में उत्तीर्ण कक्षा" name="previousClassPassed" placeholder="e.g. Class 4" defaultValue={student?.previousClassPassed || ""} />
          <Field label="Previous School Name" labelHi="विद्यालय का नाम" name="previousSchoolName" defaultValue={student?.previousSchoolName || ""} />

          {/* Stay in UP + Disability */}
          <Field label="Duration of stay in UP" labelHi="उत्तर प्रदेश में निवास की अवधि" name="durationOfStayInUP" placeholder="e.g. 5 years" defaultValue={student?.durationOfStayInUP || ""} />
          <Field label="Disability (if any)" labelHi="दिव्यांग है तो प्रकार" name="disabilityType" placeholder="Leave blank if not applicable" defaultValue={student?.disabilityType || ""} />

          {/* Address */}
          <Field label="Village / Mohalla" labelHi="निवास स्थान ग्राम/मोहल्ला" name="villageOrMohalla" defaultValue={student?.villageOrMohalla || ""} />
          <Field label="Post Office" labelHi="पोस्ट" name="postOffice" defaultValue={student?.postOffice || ""} />
          <Field label="Development Block" labelHi="विकास खण्ड/नगरखेड़ा" name="developmentBlock" defaultValue={student?.developmentBlock || ""} />
          <Field label="District" labelHi="जनपद" name="district" defaultValue={student?.district || ""} />
          <Field label="Pincode" labelHi="पिनकोड" name="pincode" type="text" placeholder="6 digits" defaultValue={student?.pincode || ""} />
          <Field label="Mobile Number" labelHi="मोबाइल नंबर" name="mobileNumber" type="tel" placeholder="10 digits" defaultValue={student?.mobileNumber || ""} />
          <Field label="WhatsApp Number" labelHi="व्हाट्सऐप नंबर" name="whatsappNumber" type="tel" placeholder="10 digits" defaultValue={student?.whatsappNumber || ""} />
        </div>
      </div>

      {/* ── SECTION 2: SIBLINGS ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              बालक/बालिका के भाई / बहन का विवरण
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Sibling Details</p>
          </div>
          <button
            type="button"
            onClick={addSibling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add sibling
          </button>
        </div>

        {siblings.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded">
            No siblings added — click "Add sibling" if applicable
          </p>
        ) : (
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_auto] gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100 pb-1">
              <span>नाम (Name)</span>
              <span>भाई/बहन</span>
              <span>जन्मतिथि</span>
              <span>नामांकित विद्यालय</span>
              <span>नहीं है तो कारण</span>
              <span />
            </div>

            {siblings.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr_auto] gap-2 items-start">
                <input
                  name={`sibling_name_${i}`}
                  placeholder="Full name"
                  defaultValue={s.fullName || ""}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                />
                <select
                  name={`sibling_relation_${i}`}
                  defaultValue={s.relation || "BROTHER"}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                >
                  <option value="BROTHER">Brother</option>
                  <option value="SISTER">Sister</option>
                </select>
                <input
                  name={`sibling_dob_${i}`}
                  type="date"
                  defaultValue={s.dob || ""}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                />
                <div className="space-y-1">
                  <input
                    name={`sibling_school_${i}`}
                    placeholder="School name"
                    defaultValue={s.enrolledSchoolName || ""}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={s.isEnrolled}
                      onChange={(e) => toggleEnrolled(s.id, e.target.checked)}
                      className="rounded"
                    />
                    Enrolled
                    <input type="hidden" name={`sibling_enrolled_${i}`} value={s.isEnrolled ? "true" : "false"} />
                  </label>
                </div>
                <input
                  name={`sibling_reason_${i}`}
                  placeholder={s.isEnrolled ? "N/A" : "Reason not enrolled"}
                  defaultValue={s.reasonNotEnrolled || ""}
                  disabled={s.isEnrolled}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] disabled:bg-gray-50 disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => removeSibling(s.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 3: BANK DETAILS ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          बैंक खाता विवरण
        </h2>
        <p className="text-xs text-gray-400 mb-4">Bank Account Details</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Account Holder Name" labelHi="खाता धारक का नाम" name="bankAccountHolder" defaultValue={decrypted?.bank?.accountHolder || ""} />
          <Field label="Relation to Student" labelHi="बालक/बालिका से सम्बन्ध">
            <select
              name="bankRelation"
              defaultValue={decrypted?.bank?.relationToStudent || "FATHER"}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
            >
              <option value="FATHER">Father / पिता</option>
              <option value="MOTHER">Mother / माता</option>
              <option value="GUARDIAN">Guardian / अभिभावक</option>
            </select>
          </Field>

          <Field label="Bank Name" labelHi="बैंक का नाम" name="bankName" defaultValue={decrypted?.bank?.bankName || ""} />
          <Field label="Branch" labelHi="शाखा" name="branchName" defaultValue={decrypted?.bank?.branchName || ""} />

          <Field label="Account Number" labelHi="खाता संख्या" name="accountNumber" defaultValue={decrypted?.bank?.accountNumber || ""} />
          <Field label="IFSC Code" name="ifscCode" placeholder="e.g. SBIN0001234" defaultValue={decrypted?.bank?.ifscCode || ""} />

          <Field label="Account Holder's Aadhaar No." labelHi="खाता धारक का आधार नंबर" name="bankHolderAadhaar" defaultValue={decrypted?.bank?.accountHolderAadhaar || ""} />
          <Field label="Mobile Number" labelHi="मोबाइल नंबर" name="bankMobile" type="tel" defaultValue={decrypted?.bank?.mobileNumber || ""} />

          <Field label="Biometric Aadhaar Seed No." labelHi="बायोमेट्रिक आधार लिंग नंबर (Seed)" name="aadhaarSeedNo" />
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" name="isAadhaarSeeded" value="true" defaultChecked={decrypted?.bank?.isAadhaarSeeded || false} className="rounded" />
              Aadhaar Seeded (बायोमेट्रिक लिंक)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" name="isSameFamilyMember" value="true" defaultChecked={decrypted?.bank ? decrypted.bank.isSameFamilyMember : true} className="rounded" />
              Same Family Member (Yes)
            </label>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: DOCUMENTS / ATTACHMENTS ──────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          आवश्यक संलग्नक
        </h2>
        <p className="text-xs text-gray-400 mb-4">Required Attachments — upload scanned copies</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FileField
            label="Student's Aadhaar Card"
            labelHi="छात्र/छात्रा के आधार कार्ड की फोटोकॉपी"
            name="file_studentAadhaar"
          />
          <FileField
            label="Father's Aadhaar Card"
            labelHi="पिता के आधार कार्ड की फोटोकॉपी"
            name="file_fatherAadhaar"
          />
          <FileField
            label="Mother's Aadhaar Card"
            labelHi="माता के आधार कार्ड की फोटोकॉपी"
            name="file_motherAadhaar"
          />
          <FileField
            label="Bank Passbook"
            labelHi="माता/पिता/संरक्षक के बैंक पासबुक की फोटोकॉपी"
            name="file_bankPassbook"
          />
        </div>
      </div>

      {/* ── SECTION 5: DECLARATION ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          अभिभावक शपथ घोषणा
        </h2>

        <p className="text-xs text-gray-600 leading-relaxed mb-4 p-3 bg-gray-50 rounded border border-gray-100">
          मैं .............. उक्त बालक की आपूर्ण पूछ-ताछ/जाँची कि मैंने उपरोक्त बातों की जो जानकारी दे अपना बयान दिया
          है। मेरा बयान सत्य है। मेरे परिवार द्वारा इस विद्यालय में जाना जाती है और सभी नामांकित नहीं है। उपरोक्त जन्म
          दिनांक की उपर लिखा है वह ठीक है। लर्व मेरा बैंक अकाउंट आधार कार्ड से जोड़ है।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-500">
          <div className="border-t border-gray-300 pt-2 text-center">
            हस्ताक्षर पिता/माता/अभिभावक<br />
            <span className="text-gray-400">जमा अंगुठा निशान</span>
          </div>
          <div className="border-t border-gray-300 pt-2 text-center">
            हस्ताक्षर प्रधानाचार्य/कक्षाध्यापक
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Date / दिनांक
            </label>
            <input
              name="declarationDate"
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]}
              className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))]"
            />
          </div>
        </div>
      </div>

      {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          className="px-6 py-2.5 rounded-md text-sm font-medium text-white transition-colors"
          style={{ background: "hsl(var(--primary))" }}
        >
          {isEdit ? "Update Admission Form" : "Save Admission Form"}
        </button>
        <Link
          href={isEdit ? `/${locale}/admin/students/${student.id}` : `/${locale}/admin/students`}
          className="px-4 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
