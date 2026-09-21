"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTeacher } from "@/app/actions/update-teacher";
import { toggleTeacherStatusAction } from "@/app/actions/toggle-teacher-status";
import { resetUserPassword } from "@/app/actions/reset-password";
import { ArrowLeft, User, Edit2, KeyRound, ShieldAlert, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import Link from "next/link";

interface TeacherDetail {
  id: string;
  fullName: string;
  employeeCode: string;
  designation: string | null;
  qualification: string | null;
  dateOfJoining: Date | null;
  photoUrl: string | null;
  userId: string;
  user: {
    phone: string;
    isActive: boolean;
  };
  classTeacherOf: {
    class: { name: string };
  }[];
}

export function TeacherDetailView({
  locale,
  teacher,
  classes,
}: {
  locale: string;
  teacher: TeacherDetail;
  classes: string[];
}) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Status deactivation state
  const [statusLoading, setStatusLoading] = useState(false);

  // Password reset state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const assignedClass = teacher.classTeacherOf?.[0];
  const dateFormatted = teacher.dateOfJoining
    ? new Date(teacher.dateOfJoining).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  async function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await updateTeacher(fd);
      if (res.success) {
        setSuccessMsg(res.message);
        setIsEditing(false);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    setErrorMsg("");
    setSuccessMsg("");
    setStatusLoading(true);

    const nextStatus = !teacher.user.isActive;

    try {
      const res = await toggleTeacherStatusAction({
        userId: teacher.userId,
        isActive: nextStatus,
        locale,
        teacherId: teacher.id,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to toggle status.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetError("");
    setResetLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await resetUserPassword(fd);
      setResetSuccess(true);
      setResetOpen(false);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── PROFILE HEADER ────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-sm border border-gray-200 overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
              {teacher.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teacher.photoUrl} alt={teacher.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-gray-400" />
              )}
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900">{teacher.fullName}</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Employee Code: <span className="font-mono font-medium">{teacher.employeeCode}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs px-2.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-100">
                  {teacher.designation || "Teacher"}
                </span>
                {teacher.user.isActive ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-sm bg-green-50 text-green-700 border border-green-100 font-medium">
                    Active Account
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-sm bg-red-50 text-red-700 border border-red-100 font-medium flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Deactivated
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/admin/teachers`}
              className="p-2 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold text-white transition-colors"
                style={{ background: "hsl(var(--primary))" }}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CORE PROFILE DETAILS (In-place edit form) ────────────────────── */}
      <form onSubmit={handleUpdateSubmit} className="space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="teacherId" value={teacher.id} />
        <input type="hidden" name="userId" value={teacher.userId} />

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
            Detailed Profile / विस्तृत प्रोफाइल
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
              {isEditing ? (
                <input
                  name="fullName"
                  required
                  defaultValue={teacher.fullName}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-800">{teacher.fullName}</p>
              )}
            </div>

            {/* Employee Code */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee Code</label>
              {isEditing ? (
                <input
                  name="employeeCode"
                  required
                  defaultValue={teacher.employeeCode}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-800 font-mono">{teacher.employeeCode}</p>
              )}
            </div>

            {/* Mobile/Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number (Login ID)</label>
              {isEditing ? (
                <input
                  name="phone"
                  required
                  defaultValue={teacher.user.phone}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-800 font-mono">{teacher.user.phone}</p>
              )}
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
              {isEditing ? (
                <select
                  name="designation"
                  defaultValue={teacher.designation || ""}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                >
                  <option value="">Select Designation</option>
                  <option value="Assistant Teacher">Assistant Teacher / सहायक अध्यापक</option>
                  <option value="Shikshamitra">Shikshamitra / शिक्षामित्र</option>
                  <option value="TGT">TGT / प्रशिक्षित स्नातक</option>
                  <option value="PGT">PGT / प्रवक्ता</option>
                  <option value="Headmaster">Headmaster / प्रधानाध्यापक</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-800">{teacher.designation || "-"}</p>
              )}
            </div>

            {/* Qualifications */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Qualifications</label>
              {isEditing ? (
                <input
                  name="qualification"
                  defaultValue={teacher.qualification || ""}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-800">{teacher.qualification || "-"}</p>
              )}
            </div>

            {/* Date of Joining */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date of Joining</label>
              {isEditing ? (
                <input
                  name="dateOfJoining"
                  type="date"
                  defaultValue={teacher.dateOfJoining ? new Date(teacher.dateOfJoining).toISOString().split("T")[0] : ""}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                />
              ) : (
                <p className="text-sm font-semibold text-gray-800">{dateFormatted}</p>
              )}
            </div>

            {/* Class Teacher Assignment */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Class Teacher Assignment</label>
              {isEditing ? (
                <select
                  name="classAssignment"
                  defaultValue={assignedClass?.class.name || ""}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                >
                  <option value="">None</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-800">
                  {assignedClass
                    ? `Class ${assignedClass.class.name} (Section A)`
                    : "-"}
                </p>
              )}
            </div>

            {/* Photo update option */}
            {isEditing && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Update Photo</label>
                <input
                  type="file"
                  name="teacherPhoto"
                  accept="image/*"
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
            )}
          </div>

          {/* Edit form actions */}
          {isEditing && (
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-65"
              >
                {loading && <Loader className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>

      {/* ── SECURITY ACTIONS & RESET PASSWORD ───────────────────────────── */}
      {!isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Deactivation Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Account Management</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Toggle this teacher's portal permission. Deactivating the account suspends login access immediately.
            </p>
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className={[
                "px-4 py-2 rounded text-xs font-semibold text-white transition-colors disabled:opacity-65",
                teacher.user.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700",
              ].join(" ")}
            >
              {statusLoading && <Loader className="h-3 w-3 animate-spin mr-1.5 inline" />}
              {teacher.user.isActive ? "Deactivate Account" : "Activate Account"}
            </button>
          </div>

          {/* Reset Password Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">Security & Password</h3>
            {resetSuccess && (
              <p className="text-xs font-medium text-green-600 mb-4">
                ✓ Temporary password reset successfully saved.
              </p>
            )}

            {!resetOpen ? (
              <button
                onClick={() => setResetOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                Reset Portal Password
              </button>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input type="hidden" name="userId" value={teacher.userId} />
                {resetError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">
                    {resetError}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">New Password</label>
                    <input
                      name="newPassword"
                      type="password"
                      required
                      minLength={8}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Confirm Password</label>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] bg-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-65"
                  >
                    {resetLoading ? "Saving…" : "Save Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetOpen(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
