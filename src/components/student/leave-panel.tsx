"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyStudentLeaveAction } from "@/app/actions/leave";
import { Calendar, AlertCircle, CheckCircle2, Loader, Send } from "lucide-react";

interface LeaveItem {
  id: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
}

export function StudentLeavePanel({
  locale,
  pastRequests,
}: {
  locale: string;
  pastRequests: LeaveItem[];
}) {
  const router = useRouter();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!fromDate || !toDate || !reason.trim()) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await applyStudentLeaveAction({
        fromDateString: fromDate,
        toDateString: toDate,
        reason,
        locale,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setFromDate("");
        setToDate("");
        setReason("");
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An error occurred while submitting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Leave Application Form */}
      <div className="md:col-span-1 bg-white border border-gray-200 rounded-lg p-5 sticky top-24 h-max">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4 flex items-center gap-1.5">
          <Send className="h-4 w-4 text-[hsl(var(--primary))]" />
          Apply for Leave / प्रार्थना पत्र भेजें
        </h2>

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-500 mb-1">From Date / अवकाश प्रारंभ</label>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-1">To Date / अवकाश समाप्ति</label>
            <input
              type="date"
              required
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none bg-white text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Reason / कारण</label>
            <textarea
              required
              rows={3}
              value={reason}
              placeholder="Write the reason here..."
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none bg-white text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-white font-medium rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            style={{ background: "hsl(var(--primary))" }}
          >
            {loading && <Loader className="h-3.5 w-3.5 animate-spin" />}
            Submit Application
          </button>
        </form>
      </div>

      {/* Past Requests List */}
      <div className="md:col-span-2 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4">
            Leave Status Register / प्रार्थना पत्र सूची
          </h2>

          {pastRequests.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">
              No leave requests registered.
            </p>
          ) : (
            <div className="space-y-3">
              {pastRequests.map((req) => {
                const isPending = req.status === "PENDING";
                const isApproved = req.status === "APPROVED";

                return (
                  <div
                    key={req.id}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="flex items-center gap-1 font-bold text-gray-700">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(req.fromDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        -{" "}
                        {new Date(req.toDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>

                      <span
                        className={[
                          "px-2.5 py-0.5 rounded-full font-bold text-[10px]",
                          isApproved
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : isPending
                            ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
                            : "bg-red-50 text-red-700 border border-red-100",
                        ].join(" ")}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-gray-600 leading-relaxed font-medium">
                      {req.reason}
                    </p>
                    <p className="text-[10px] text-gray-400 text-right">
                      Submitted: {new Date(req.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
