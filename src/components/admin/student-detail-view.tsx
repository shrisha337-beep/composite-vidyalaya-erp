"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Edit2, Eye, EyeOff, FileText,
  User, Users, Home, BookOpen, CreditCard,
  Paperclip, KeyRound, ShieldAlert, Unlock
} from "lucide-react";
import {
  resetStudentPasswordAction,
  unlockStudentAccountAction,
} from "@/app/actions/student-credentials";

// ── Types (matching Prisma includes in the page) ──────────────────────────────

interface Guardian {
  id: string;
  relation: string;
  fullName: string;
  aadhaarNumber: string | null; // decrypted
  occupation: string | null;
  phone: string | null;
  isPrimaryContact: boolean;
}

interface Sibling {
  id: string;
  fullName: string;
  relation: string;
  dob: Date | null;
  enrolledSchoolName: string | null;
  isEnrolled: boolean;
  reasonNotEnrolled: string | null;
}

interface BankDetail {
  accountHolder: string;
  relationToStudent: string;
  bankName: string;
  branchName: string | null;
  accountNumber: string | null; // decrypted
  ifscCode: string;
  accountHolderAadhaar: string | null; // decrypted
  mobileNumber: string | null;
  isAadhaarSeeded: boolean;
  isSameFamilyMember: boolean;
}

interface Document {
  id: string;
  type: string;
  fileUrl: string;
}

interface StudentUser {
  id: string;
  phone: string;
  isActive: boolean;
  lockedUntil: Date | null;
  credentialsIssuedAt?: Date | null;
}

interface Student {
  id: string;
  admissionNo: string;
  fullName: string;
  dob: Date;
  dobInWords: string | null;
  gender: string;
  category: string | null;
  subCaste: string | null;
  religion: string | null;
  rationCardType: string | null;
  disabilityType: string | null;
  villageOrMohalla: string | null;
  postOffice: string | null;
  developmentBlock: string | null;
  district: string | null;
  pincode: string | null;
  durationOfStayInUP: string | null;
  mobileNumber: string | null;
  whatsappNumber: string | null;
  previousClassPassed: string | null;
  previousSchoolName: string | null;
  photoUrl: string | null;
  admissionDate: Date;
  isActive: boolean;
  udiseCode: string | null;
  penNumber: string | null;
  apaarId: string | null;
  section: { class: { name: string } } | null;
  guardians: Guardian[];
  siblings: Sibling[];
  bankDetails: BankDetail | null;
  documents: Document[];
  user: StudentUser;
  transferCertificates: any[];
}

interface DecryptedData {
  studentAadhaar: string | null;
  guardians: (Guardian & { aadhaarNumber: string | null })[];
  bank: (BankDetail & { accountNumber: string | null; accountHolderAadhaar: string | null }) | null;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-400 italic">-</p>
    </div>
  );
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <Icon className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Masked sensitive field with show/hide toggle
function MaskedField({ label, value }: { label: string; value: string | null }) {
  const [show, setShow] = useState(false);
  if (!value) return <InfoRow label={label} value={null} />;

  const masked = value.length > 4
    ? "X".repeat(value.length - 4) + value.slice(-4)
    : "****";

  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-gray-800 font-medium font-mono">
          {show ? value : masked}
        </p>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-gray-400 hover:text-gray-600"
          title={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// One-time student portal credential reset & account unlock controls
function StudentPortalAccessControls({
  studentId,
  admissionNo,
  isLocked,
}: {
  studentId: string;
  admissionNo: string;
  isLocked: boolean;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [error, setError] = useState("");
  const [unlockedMsg, setUnlockedMsg] = useState("");
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null);

  async function handleReset() {
    setError("");
    setLoadingReset(true);
    try {
      const res = await resetStudentPasswordAction(studentId);
      if (!res.ok || !res.initialPassword) {
        setError(res.error ?? "Failed to reset student password.");
      } else {
        setIssuedPassword(res.initialPassword);
        setConfirmReset(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleUnlock() {
    setError("");
    setUnlockedMsg("");
    setLoadingUnlock(true);
    try {
      const res = await unlockStudentAccountAction(studentId);
      if (!res.ok) {
        setError(res.error ?? "Failed to unlock student account.");
      } else {
        setUnlockedMsg("Account unlocked.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock account.");
    } finally {
      setLoadingUnlock(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2.5 py-1.5">
          {error}
        </p>
      )}
      {unlockedMsg && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2.5 py-1.5 font-medium">
          {unlockedMsg}
        </p>
      )}
      {issuedPassword && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-900">
            One-time Initial Password Generated (shown only once — write down or print now):
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              Admission No: <strong className="font-mono">{admissionNo}</strong>
            </span>
            <span>
              Initial Password:{" "}
              <strong className="font-mono bg-white px-2 py-0.5 border border-amber-300 rounded">
                {issuedPassword}
              </strong>
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            This password is never stored in plaintext. If lost, click Reset Portal Password again.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <KeyRound className="h-4 w-4" />
            Reset Portal Password
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2">
            <span className="text-xs text-gray-700">
              Generate a new one-time password and invalidate the previous password?
            </span>
            <button
              type="button"
              onClick={handleReset}
              disabled={loadingReset}
              className="px-3 py-1 rounded text-xs font-semibold text-white bg-[#6B1D30] hover:bg-[#541624] disabled:opacity-60"
            >
              {loadingReset ? "Generating…" : "Confirm Reset"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              disabled={loadingReset}
              className="px-2.5 py-1 rounded border border-gray-300 text-xs text-gray-600 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        )}

        {(isLocked || unlockedMsg === "") && isLocked && (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={loadingUnlock}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
          >
            <Unlock className="h-4 w-4" />
            {loadingUnlock ? "Unlocking…" : "Unlock Account"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudentDetailView({
  student,
  decrypted,
  locale,
}: {
  student: Student;
  decrypted: DecryptedData;
  locale: string;
}) {
  const father = decrypted.guardians.find((g) => g.relation === "FATHER");
  const mother = decrypted.guardians.find((g) => g.relation === "MOTHER");
  const guardian = decrypted.guardians.find((g) => g.relation === "GUARDIAN");

  const dob = new Date(student.dob);
  const dobFormatted = dob.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const isLocked = student.user.lockedUntil && new Date(student.user.lockedUntil) > new Date();

  return (
    <div className="space-y-4">
      {/* ── Header card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Photo */}
            <div
              className="w-16 h-16 rounded-sm overflow-hidden border-2 border-gray-200 shrink-0 flex items-center justify-center bg-gray-100"
            >
              {student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-gray-400" />
              )}
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">{student.fullName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Admission No:{" "}
                <span className="font-mono font-medium text-gray-700">
                  {student.admissionNo}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {student.section && (
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-100">
                    Class {student.section.class.name}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600 border border-gray-200 capitalize">
                  {student.gender.toLowerCase()}
                </span>
                {isLocked && (
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Account locked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${locale}/admin/students`}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {student.isActive ? (
              <Link
                href={`/${locale}/admin/students/${student.id}/tc`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Issue TC
              </Link>
            ) : student.transferCertificates?.[0] ? (
              <>
                <Link
                  href={`/${locale}/admin/students/${student.id}/tc/download`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Download TC
                </Link>
                <Link
                  href={`/${locale}/admin/students/${student.id}/tc?edit=true`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit TC
                </Link>
              </>
            ) : null}
            <Link
              href={`/${locale}/admin/students/${student.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ── Basic details ────────────────────────────────────────────── */}
      <SectionCard title="Basic Information" icon={User}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Date of Birth" value={dobFormatted} />
          <InfoRow label="DOB in Words" value={student.dobInWords} />
          <InfoRow label="Gender" value={student.gender.charAt(0) + student.gender.slice(1).toLowerCase()} />
          <InfoRow label="Category / Caste" value={student.category} />
          <InfoRow label="Sub-caste" value={student.subCaste} />
          <InfoRow label="Religion" value={student.religion} />
          <InfoRow label="Ration Card Type" value={student.rationCardType} />
          <InfoRow label="Disability" value={student.disabilityType ?? "Not applicable"} />
          <MaskedField label="Aadhaar Number" value={decrypted.studentAadhaar} />
          <InfoRow label="UDISE Code" value={student.udiseCode} />
          <InfoRow label="PEN Number" value={student.penNumber} />
          <InfoRow label="APAAR ID" value={student.apaarId} />
        </div>
      </SectionCard>

      {/* ── Parents & Guardian ───────────────────────────────────────── */}
      <SectionCard title="Parents & Guardian" icon={Users}>
        <div className="space-y-4">
          {[
            { label: "Father", data: father },
            { label: "Mother", data: mother },
            { label: "Guardian", data: guardian },
          ].map(({ label, data }) =>
            data ? (
              <div key={label} className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <InfoRow label={`${label}'s Name`} value={data.fullName} />
                <MaskedField label={`${label}'s Aadhaar`} value={data.aadhaarNumber} />
                <InfoRow label="Occupation" value={data.occupation} />
                <InfoRow label="Phone" value={data.phone} />
              </div>
            ) : null
          )}
        </div>
      </SectionCard>

      {/* ── Address & Contact ────────────────────────────────────────── */}
      <SectionCard title="Address & Contact" icon={Home}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow label="Village / Mohalla" value={student.villageOrMohalla} />
          <InfoRow label="Post Office" value={student.postOffice} />
          <InfoRow label="Development Block" value={student.developmentBlock} />
          <InfoRow label="District" value={student.district} />
          <InfoRow label="Pincode" value={student.pincode} />
          <InfoRow label="Duration of stay in UP" value={student.durationOfStayInUP} />
          <InfoRow label="Mobile Number" value={student.mobileNumber} />
          <InfoRow label="WhatsApp Number" value={student.whatsappNumber} />
        </div>
      </SectionCard>

      {/* ── Academic ─────────────────────────────────────────────────── */}
      <SectionCard title="Academic Details" icon={BookOpen}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoRow
            label="Current Class"
            value={student.section ? `Class ${student.section.class.name}` : undefined}
          />
          <InfoRow label="Previously Passed Class" value={student.previousClassPassed} />
          <InfoRow label="Previous School" value={student.previousSchoolName} />
          <InfoRow
            label="Admission Date"
            value={new Date(student.admissionDate).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          />
        </div>
      </SectionCard>

      {/* ── Siblings ─────────────────────────────────────────────────── */}
      {student.siblings.length > 0 && (
        <SectionCard title="Siblings" icon={Users}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">Name</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">Relation</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">DOB</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">School</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {student.siblings.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 font-medium text-gray-800">{s.fullName}</td>
                    <td className="py-2 text-gray-600 capitalize">{s.relation.toLowerCase()}</td>
                    <td className="py-2 text-gray-600">
                      {s.dob
                        ? new Date(s.dob).toLocaleDateString("en-IN")
                        : "-"}
                    </td>
                    <td className="py-2 text-gray-600">{s.enrolledSchoolName ?? "-"}</td>
                    <td className="py-2">
                      {s.isEnrolled ? (
                        <span className="text-green-600 text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-red-500 text-xs">{s.reasonNotEnrolled ?? "No"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Bank Details ─────────────────────────────────────────────── */}
      {decrypted.bank && (
        <SectionCard title="Bank Account Details" icon={CreditCard}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoRow label="Account Holder" value={decrypted.bank.accountHolder} />
            <InfoRow label="Relation to Student" value={decrypted.bank.relationToStudent} />
            <InfoRow label="Bank Name" value={decrypted.bank.bankName} />
            <InfoRow label="Branch" value={decrypted.bank.branchName} />
            <MaskedField label="Account Number" value={decrypted.bank.accountNumber} />
            <InfoRow label="IFSC Code" value={decrypted.bank.ifscCode} />
            <MaskedField label="Account Holder Aadhaar" value={decrypted.bank.accountHolderAadhaar} />
            <InfoRow label="Mobile" value={decrypted.bank.mobileNumber} />
            <InfoRow
              label="Aadhaar Seeded"
              value={decrypted.bank.isAadhaarSeeded ? "Yes" : "No"}
            />
            <InfoRow
              label="Same Family Member"
              value={decrypted.bank.isSameFamilyMember ? "Yes" : "No"}
            />
          </div>
        </SectionCard>
      )}

      {/* ── Documents ────────────────────────────────────────────────── */}
      {student.documents.length > 0 && (
        <SectionCard title="Uploaded Documents" icon={Paperclip}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {student.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate capitalize">
                  {doc.type.toLowerCase().replace(/_/g, " ")}
                </span>
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Portal Access / Password Reset ───────────────────────────── */}
      <SectionCard title="Portal Access" icon={KeyRound}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4 border-b border-gray-100">
            <InfoRow label="Login ID (Admission No.)" value={student.admissionNo} />
            <InfoRow label="Account Status" value={student.user.isActive ? "Active" : "Inactive"} />
            <InfoRow
              label="Credentials Issued"
              value={
                student.user.credentialsIssuedAt
                  ? new Date(student.user.credentialsIssuedAt).toLocaleString("en-IN")
                  : "Not issued yet"
              }
            />
            {isLocked && (
              <InfoRow
                label="Locked Until"
                value={new Date(student.user.lockedUntil!).toLocaleString("en-IN")}
              />
            )}
          </div>
          <StudentPortalAccessControls
            studentId={student.id}
            admissionNo={student.admissionNo}
            isLocked={Boolean(isLocked)}
          />
        </div>
      </SectionCard>
    </div>
  );
}
