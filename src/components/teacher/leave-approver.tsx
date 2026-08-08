"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewLeaveAction } from "@/app/actions/leave";
import { Check, X, Calendar, User, Loader, CheckCircle2, AlertCircle } from "lucide-react";

interface StudentLeaveRequest {
  id: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Date;
  student: {
    fullName: string;
    admissionNo: string;
    section: {
      name: string;
      class: { name: string };
    } | null;
  } | null;
}

export function LeaveApprover({
  locale,
  requests,
}: {
  locale: string;
  requests: StudentLeaveRequest[];
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
          Pending Student Applications / लंबित प्रार्थना पत्र ({pendingRequests.length})
        </h2>

        {pendingRequests.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">
            No pending student leave applications found.
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800 text-sm">
                        {req.student?.fullName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-semibold text-[10px]">
                        Class {req.student?.section?.class.name} (Section {req.student?.section?.name})
                      </span>
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
          Review History / पूर्व में संसाधित प्रार्थना पत्र
        </h2>

        {reviewedRequests.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded">
            No previously reviewed student leave requests.
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
                    <div>
                      <span className="font-bold text-gray-700">{req.student?.fullName}</span>
                      <span className="ml-2 text-[10px] text-gray-400">Class {req.student?.section?.class.name}</span>
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
