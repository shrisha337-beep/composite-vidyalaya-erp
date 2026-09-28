"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAddPastLeaveAction } from "@/app/actions/leave";
import {
  Plus,
  Calendar,
  Loader,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const LEAVE_TYPES = [
  { value: "CASUAL_LEAVE", label: "Casual Leave (CL)" },
  { value: "MEDICAL_LEAVE", label: "Medical Leave (ML)" },
  { value: "CHILD_CARE_LEAVE", label: "Child Care Leave (CCL) — Female only" },
  { value: "MATERNITY_LEAVE", label: "Maternity Leave — Female only" },
  { value: "ABORTION_LEAVE", label: "Abortion Leave — Female only" },
];

interface TeacherOption {
  id: string;
  fullName: string;
  employeeCode: string;
}

export function AdminPastLeaveForm({
  locale,
  teachers,
}: {
  locale: string;
  teachers: TeacherOption[];
}) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [teacherId, setTeacherId] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  function resetForm() {
    setTeacherId("");
    setLeaveType("");
    setFromDate("");
    setToDate("");
    setReason("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await adminAddPastLeaveAction({
        teacherId,
        leaveType,
        fromDateString: fromDate,
        toDateString: toDate,
        reason,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        resetForm();
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An error occurred while recording leave.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center">
            <Plus className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              Add Past Leave / पूर्व अवकाश दर्ज करें
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Record a previously taken leave for any teacher
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Form Content */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {successMsg && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Teacher Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Select Teacher / शिक्षक चुनें
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              >
                <option value="">— Select a teacher —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Leave Type / अवकाश प्रकार
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
              >
                <option value="">— Select leave type —</option>
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  From Date / से
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  To Date / तक
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Reason / कारण
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent resize-y"
                placeholder="Reason for leave…"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs">
                This leave will be auto-approved and will reflect on the teacher&apos;s leave portal.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60 flex items-center gap-2"
                style={{ background: "hsl(var(--primary))" }}
              >
                {loading && <Loader className="h-3.5 w-3.5 animate-spin" />}
                Record Past Leave
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
