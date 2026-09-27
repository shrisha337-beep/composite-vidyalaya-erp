"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewLeaveAction } from "@/app/actions/leave";
import { Check, X, Calendar, User, Loader, CheckCircle2, AlertCircle } from "lucide-react";

interface TeacherLeaveRequest {
  id: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
  leaveType: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  clBalance?: { used: number; remaining: number; limit: number } | null;
  teacher: {
    fullName: string;
    employeeCode: string;
    designation: string | null;
  } | null;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  CASUAL_LEAVE: "CL",
  MEDICAL_LEAVE: "ML",
  CHILD_CARE_LEAVE: "CCL",
  MATERNITY_LEAVE: "Maternity",
  ABORTION_LEAVE: "Abortion Leave",
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  CASUAL_LEAVE: "bg-sky-50 text-sky-700 border-sky-200",
  MEDICAL_LEAVE: "bg-amber-50 text-amber-700 border-amber-200",
  CHILD_CARE_LEAVE: "bg-purple-50 text-purple-700 border-purple-200",
  MATERNITY_LEAVE: "bg-pink-50 text-pink-700 border-pink-200",
  ABORTION_LEAVE: "bg-rose-50 text-rose-700 border-rose-200",
};

export function TeacherLeaveApprover({
  locale,
  requests,
}: {
  locale: string;
  requests: TeacherLeaveRequest[];
}) {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleReview(id: string, status: "APPROVED" | "REJECTED") {
    setErrorMsg("");
    setSuccessMsg("");
    setLoadingId(id);

    try {
      const res = await reviewLeaveAction({ leaveId: id, status, locale });
      if (res.success) {
        setSuccessMsg(res.message);
        router.refresh();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("An error occurred while reviewing.");
    } finally {
      setLoadingId(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const reviewedRequests = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
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

      {/* Pending Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4">
          Pending Teacher Applications / शिक्षक छुट्टी आवेदन ({pendingRequests.length})
        </h2>

        {pendingRequests.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">
            No pending teacher leave requests found.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => {
              const isProcessing = loadingId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">
                        {req.teacher?.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-[10px] capitalize">
                        {req.teacher?.designation || "Teacher"}
                      </span>
                      {req.leaveType && (
                        <span className={`px-2 py-0.5 rounded border font-semibold text-[10px] ${LEAVE_TYPE_COLORS[req.leaveType] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                          {LEAVE_TYPE_LABELS[req.leaveType] || req.leaveType}
                        </span>
                      )}
                      {req.clBalance && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[10px]">
                          CL: {req.clBalance.remaining}/{req.clBalance.limit} left
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-gray-500 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
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
                    </div>

                    <p className="text-gray-600 leading-relaxed font-semibold">
                      Reason: {req.reason}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleReview(req.id, "APPROVED")}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-50"
                    >
                      {isProcessing && loadingId === req.id ? (
                        <Loader className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "REJECTED")}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-50 pb-3 mb-4">
          Review History / पूर्व में संसाधित आवेदन
        </h2>

        {reviewedRequests.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">
            No previously reviewed teacher leave requests.
          </p>
        ) : (
          <div className="space-y-3">
            {reviewedRequests.map((req) => {
              const isApproved = req.status === "APPROVED";
              return (
                <div
                  key={req.id}
                  className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-700">{req.teacher?.fullName}</span>
                      <span className="text-[10px] text-gray-400">({req.teacher?.designation})</span>
                      {req.leaveType && (
                        <span className={`px-2 py-0.5 rounded border font-semibold text-[10px] ${LEAVE_TYPE_COLORS[req.leaveType] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                          {LEAVE_TYPE_LABELS[req.leaveType] || req.leaveType}
                        </span>
                      )}
                      {req.clBalance && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-[10px]">
                          CL: {req.clBalance.remaining}/{req.clBalance.limit} left
                        </span>
                      )}
                    </div>
                    <span
                      className={[
                        "px-2 py-0.5 rounded font-bold text-[9px]",
                        isApproved
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : "bg-red-50 text-red-700 border border-red-100",
                      ].join(" ")}
                    >
                      {req.status}
                    </span>
                  </div>
                  <p className="text-gray-500 font-medium">Reason: {req.reason}</p>
                  <p className="text-[10px] text-gray-400">
                    Dates: {new Date(req.fromDate).toLocaleDateString()} to {new Date(req.toDate).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
