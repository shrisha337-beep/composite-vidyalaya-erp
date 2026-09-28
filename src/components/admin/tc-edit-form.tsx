"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTransferCertificate, deleteTransferCertificateAction } from "@/app/actions/update-tc";

function Field({
  label,
  labelHi,
  required,
  children,
  className,
}: {
  label: string;
  labelHi?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
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
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] focus:border-transparent bg-white";
const readOnlyCls =
  "w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed";

export function TcEditForm({
  locale,
  student,
  tc,
}: {
  locale: string;
  student: any;
  tc: any;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Editable state
  const [reasonForLeaving, setReasonForLeaving] = useState(tc.reasonForLeaving || "");
  const [conduct, setConduct] = useState(tc.conduct || "Good");
  const [lastClassStudied, setLastClassStudied] = useState(tc.lastClassStudied || "");
  const [dateOfLeaving, setDateOfLeaving] = useState(
    tc.dateOfLeaving ? new Date(tc.dateOfLeaving).toISOString().split("T")[0] : ""
  );
  const [dateOfIssue, setDateOfIssue] = useState(
    tc.dateOfIssue ? new Date(tc.dateOfIssue).toISOString().split("T")[0] : ""
  );
  const [promotedTo, setPromotedTo] = useState(tc.promotedTo || "");
  const [workingDaysTotal, setWorkingDaysTotal] = useState(tc.workingDaysTotal || 0);
  const [workingDaysPresent, setWorkingDaysPresent] = useState(tc.workingDaysPresent || 0);
  const [qualifiedForPromotion, setQualifiedForPromotion] = useState(
    tc.qualifiedForPromotion ?? true
  );
  const [subjectsStudied, setSubjectsStudied] = useState(
    (tc.subjectsStudied || []).join(", ")
  );
  const [remarks, setRemarks] = useState(tc.remarks || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateTransferCertificate({
      tcId: tc.id,
      reasonForLeaving,
      conduct,
      lastClassStudied,
      dateOfLeaving,
      dateOfIssue,
      promotedTo,
      workingDaysTotal: Number(workingDaysTotal),
      workingDaysPresent: Number(workingDaysPresent),
      qualifiedForPromotion,
      subjectsStudied: subjectsStudied
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean),
      remarks,
      locale,
    });

    setSaving(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/admin/students/${student.id}`);
      }, 1500);
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          TC updated successfully. Redirecting...
        </div>
      )}

      {/* ── FROZEN SNAPSHOT FIELDS (Read-only) ──────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          Frozen Fields (Read-Only)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          These snapshot fields are part of the legal TC record and cannot be edited.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="TC Number" labelHi="क्रम संख्या">
            <input value={tc.tcNumber} readOnly className={readOnlyCls} />
          </Field>
          <Field label="Student Name" labelHi="छात्र का नाम">
            <input value={tc.studentNameSnapshot} readOnly className={readOnlyCls} />
          </Field>
          <Field label="Father's Name" labelHi="पिता का नाम">
            <input value={tc.fatherNameSnapshot || ""} readOnly className={readOnlyCls} />
          </Field>
          <Field label="Mother's Name" labelHi="माता का नाम">
            <input value={tc.motherNameSnapshot || ""} readOnly className={readOnlyCls} />
          </Field>
          <Field label="Date of Birth" labelHi="जन्म तिथि">
            <input
              value={tc.dobSnapshot ? new Date(tc.dobSnapshot).toLocaleDateString("en-IN") : ""}
              readOnly
              className={readOnlyCls}
            />
          </Field>
          <Field label="Category" labelHi="जाति">
            <input value={tc.categorySnapshot || ""} readOnly className={readOnlyCls} />
          </Field>
        </div>
      </div>

      {/* ── EDITABLE FIELDS ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          Editable Fields
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          You can edit these fields. Changes will be logged in the audit trail.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Reason for Leaving" labelHi="विद्यालय छोड़ने का कारण" required>
            <input
              value={reasonForLeaving}
              onChange={(e) => setReasonForLeaving(e.target.value)}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Conduct" labelHi="चरित्र एवं आचरण">
            <select
              value={conduct}
              onChange={(e) => setConduct(e.target.value)}
              className={inputCls}
            >
              <option value="Good">Good / अच्छा</option>
              <option value="Very Good">Very Good / बहुत अच्छा</option>
              <option value="Excellent">Excellent / उत्कृष्ट</option>
              <option value="Satisfactory">Satisfactory / संतोषजनक</option>
            </select>
          </Field>

          <Field label="Last Class Studied" labelHi="अन्तिम कक्षा" required>
            <input
              value={lastClassStudied}
              onChange={(e) => setLastClassStudied(e.target.value)}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Promoted To" labelHi="उत्तीर्ण कक्षा">
            <input
              value={promotedTo}
              onChange={(e) => setPromotedTo(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Date of Leaving" labelHi="विद्यालय छोड़ने की तिथि" required>
            <input
              type="date"
              value={dateOfLeaving}
              onChange={(e) => setDateOfLeaving(e.target.value)}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Date of Issue" labelHi="जारी करने की तिथि" required>
            <input
              type="date"
              value={dateOfIssue}
              onChange={(e) => setDateOfIssue(e.target.value)}
              required
              className={inputCls}
            />
          </Field>

          <Field label="School Working Days" labelHi="विद्यालय के कार्य दिवस">
            <input
              type="number"
              value={workingDaysTotal}
              onChange={(e) => setWorkingDaysTotal(Number(e.target.value))}
              className={inputCls}
            />
          </Field>

          <Field label="Student Present Days" labelHi="छात्र की उपस्थिति">
            <input
              type="number"
              value={workingDaysPresent}
              onChange={(e) => setWorkingDaysPresent(Number(e.target.value))}
              className={inputCls}
            />
          </Field>

          <Field label="Qualified for Promotion" labelHi="उत्तीर्ण" className="sm:col-span-2">
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={qualifiedForPromotion}
                onChange={(e) => setQualifiedForPromotion(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[hsl(var(--primary))]"
              />
              <span className="text-sm text-gray-700">
                Yes, qualified for promotion / हाँ, उत्तीर्ण
              </span>
            </label>
          </Field>

          <Field label="Subjects Studied" labelHi="अध्ययन विषय" className="sm:col-span-2">
            <input
              value={subjectsStudied}
              onChange={(e) => setSubjectsStudied(e.target.value)}
              placeholder="Hindi, English, Mathematics, Science, Social Science"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated list</p>
          </Field>

          <Field label="Remarks" labelHi="टिप्पणी" className="sm:col-span-2">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || deleting}
          className="px-6 py-2.5 rounded text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: "hsl(var(--primary))" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/students/${student.id}`)}
          className="px-4 py-2.5 rounded text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>

        {/* Delete TC Button */}
        <button
          type="button"
          disabled={deleting || saving}
          onClick={async () => {
            if (!confirm(
              `Are you sure you want to DELETE TC #${tc.tcNumber}?\n\nThis will:\n- Permanently delete the Transfer Certificate\n- Re-activate the student (${student.fullName})\n- Re-enable their portal login\n\nThis action cannot be undone.`
            )) return;
            setDeleting(true);
            setError(null);
            try {
              const res = await deleteTransferCertificateAction({ tcId: tc.id, locale });
              if (res.success) {
                router.push(`/${locale}/admin/students/${student.id}`);
              } else {
                setError(res.message);
              }
            } catch {
              setError("Failed to delete TC.");
            } finally {
              setDeleting(false);
            }
          }}
          className="ml-auto px-4 py-2.5 rounded text-sm font-semibold text-red-700 border border-red-300 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete TC / TC हटाएं"}
        </button>
      </div>
    </form>
  );
}
