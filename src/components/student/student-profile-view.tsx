"use client";

import { useState } from "react";
import { User, Eye, EyeOff, FileDown, Calendar, ShieldCheck, Landmark } from "lucide-react";

interface GuardianDetail {
  id: string;
  relation: string;
  fullName: string;
  phone?: string | null;
  aadhaarNumber?: string | null;
  occupation?: string | null;
}

interface StudentProfile {
  id: string;
  admissionNo: string;
  fullName: string;
  dob?: Date | null;
  gender?: string;
  category?: string | null;
  religion?: string | null;
  bloodGroup?: string | null;
  udiseCode?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  studentAadhaarDecrypted?: string | null;
  fatherAadhaarDecrypted?: string | null;
  motherAadhaarDecrypted?: string | null;
  bankAccountDecrypted?: string | null;
  bankAccountHolder?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  studentAadhaarUrl?: string | null;
  fatherAadhaarUrl?: string | null;
  motherAadhaarUrl?: string | null;
  bankPassbookUrl?: string | null;
  section?: {
    name: string;
    class: { name: string };
  } | null;
  guardians?: GuardianDetail[];
}

export function StudentProfileView({
  student,
}: {
  student: StudentProfile;
}) {
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showFatherAadhaar, setShowFatherAadhaar] = useState(false);
  const [showMotherAadhaar, setShowMotherAadhaar] = useState(false);
  const [showBank, setShowBank] = useState(false);

  // Helper to mask values
  function maskValue(value: string | null | undefined) {
    if (!value) return "—";
    if (value.length <= 4) return "****";
    return "*".repeat(value.length - 4) + value.slice(-4);
  }

  const father = student.guardians?.find((g) => g.relation === "FATHER");
  const mother = student.guardians?.find((g) => g.relation === "MOTHER");

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-16 h-16 rounded-full border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
          {student.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-gray-400" />
          )}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-lg font-bold text-gray-900">{student.fullName}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Admission No: <span className="font-mono font-medium">{student.admissionNo}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-[10px]">
            {student.section && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                Class {student.section.class.name} (Section {student.section.name})
              </span>
            )}
            {student.udiseCode && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold font-mono">
                  UDISE: {student.udiseCode}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* 2-Column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 mb-3">
            Personal Details / व्यक्तिगत विवरण
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-400">Date of Birth</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {student.dob
                  ? new Date(student.dob).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Gender</p>
              <p className="font-semibold text-gray-800 mt-0.5 capitalize">{student.gender?.toLowerCase() || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Category</p>
              <p className="font-semibold text-gray-800 mt-0.5">{student.category || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Religion</p>
              <p className="font-semibold text-gray-800 mt-0.5">{student.religion || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Blood Group</p>
              <p className="font-semibold text-gray-800 mt-0.5">{student.bloodGroup || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Mobile Number</p>
              <p className="font-semibold text-gray-800 mt-0.5 font-mono">{student.mobileNumber || "—"}</p>
            </div>
          </div>
        </div>

        {/* Sensitive Aadhaar details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 mb-3 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Verification IDs / आधार संख्या
          </h2>
          <div className="space-y-3 text-xs">
            {/* Student Aadhaar */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
              <div>
                <p className="text-gray-400 text-[10px]">Student Aadhaar</p>
                <p className="font-bold text-gray-800 font-mono mt-0.5">
                  {showAadhaar ? student.studentAadhaarDecrypted : maskValue(student.studentAadhaarDecrypted)}
                </p>
              </div>
              <button
                onClick={() => setShowAadhaar(!showAadhaar)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Father Aadhaar */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
              <div>
                <p className="text-gray-400 text-[10px]">Father's Aadhaar</p>
                <p className="font-bold text-gray-800 font-mono mt-0.5">
                  {showFatherAadhaar ? student.fatherAadhaarDecrypted : maskValue(student.fatherAadhaarDecrypted)}
                </p>
              </div>
              <button
                onClick={() => setShowFatherAadhaar(!showFatherAadhaar)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showFatherAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Mother Aadhaar */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
              <div>
                <p className="text-gray-400 text-[10px]">Mother's Aadhaar</p>
                <p className="font-bold text-gray-800 font-mono mt-0.5">
                  {showMotherAadhaar ? student.motherAadhaarDecrypted : maskValue(student.motherAadhaarDecrypted)}
                </p>
              </div>
              <button
                onClick={() => setShowMotherAadhaar(!showMotherAadhaar)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showMotherAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 mb-3 flex items-center gap-1">
            <Landmark className="h-4 w-4 text-blue-600" />
            Bank Account / बैंक खाता
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-400">Account Holder</p>
              <p className="font-semibold text-gray-800 mt-0.5">{student.bankAccountHolder || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Bank Name</p>
              <p className="font-semibold text-gray-800 mt-0.5">{student.bankName || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">IFSC Code</p>
              <p className="font-semibold text-gray-800 mt-0.5 font-mono">{student.ifscCode || "—"}</p>
            </div>
            <div>
              <div className="flex items-center justify-between w-full">
                <p className="text-gray-400">Account Number</p>
                <button
                  onClick={() => setShowBank(!showBank)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showBank ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="font-bold text-gray-800 font-mono mt-0.5">
                {showBank ? student.bankAccountDecrypted : maskValue(student.bankAccountDecrypted)}
              </p>
            </div>
          </div>
        </div>

        {/* Parents/Guardians info */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 mb-3">
            Guardians / अभिभावक
          </h2>
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Father */}
            <div>
              <p className="font-semibold text-gray-700">Father's Info</p>
              <p className="text-gray-800 font-bold mt-1">{father?.fullName || "—"}</p>
              <p className="text-gray-400 mt-0.5 font-mono">{father?.phone || "No Mobile"}</p>
              <p className="text-gray-400 mt-0.5">{father?.occupation || "No Occupation"}</p>
            </div>
            {/* Mother */}
            <div>
              <p className="font-semibold text-gray-700">Mother's Info</p>
              <p className="text-gray-800 font-bold mt-1">{mother?.fullName || "—"}</p>
              <p className="text-gray-400 mt-0.5 font-mono">{mother?.phone || "No Mobile"}</p>
              <p className="text-gray-400 mt-0.5">{mother?.occupation || "No Occupation"}</p>
            </div>
          </div>
        </div>

        {/* Uploaded Documents */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 md:col-span-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 mb-3">
            Uploaded Documents / अपलोडेड दस्तावेज
          </h2>
          <div className="flex flex-wrap gap-3 text-xs">
            {student.studentAadhaarUrl && (
              <a
                href={student.studentAadhaarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
              >
                <FileDown className="h-4 w-4 text-gray-400" />
                Student Aadhaar Copy
              </a>
            )}

            {student.fatherAadhaarUrl && (
              <a
                href={student.fatherAadhaarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
              >
                <FileDown className="h-4 w-4 text-gray-400" />
                Father Aadhaar Copy
              </a>
            )}

            {student.motherAadhaarUrl && (
              <a
                href={student.motherAadhaarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
              >
                <FileDown className="h-4 w-4 text-gray-400" />
                Mother Aadhaar Copy
              </a>
            )}

            {student.bankPassbookUrl && (
              <a
                href={student.bankPassbookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 font-medium text-gray-700"
              >
                <FileDown className="h-4 w-4 text-gray-400" />
                Bank Passbook Copy
              </a>
            )}

            {!student.studentAadhaarUrl && !student.fatherAadhaarUrl && !student.motherAadhaarUrl && !student.bankPassbookUrl && (
              <p className="text-gray-400 italic">No documents uploaded during registration.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
