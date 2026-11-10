"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Printer,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  issueClassCredentialsAction,
  type StudentCredentialSlip,
} from "@/app/actions/student-credentials";

export interface ClassCredentialSummary {
  id: string;
  name: string;
  totalActive: number;
  issuedCount: number;
  missingCount: number;
}

interface StudentCredentialSlipsProps {
  classes: ClassCredentialSummary[];
  schoolName: string;
  schoolNameHindi: string;
  portalUrl: string | null;
}

const SLIPS_PER_PAGE = 8;

function chunkSlips(
  slips: StudentCredentialSlip[],
  size: number
): StudentCredentialSlip[][] {
  const pages: StudentCredentialSlip[][] = [];
  for (let i = 0; i < slips.length; i += size) {
    pages.push(slips.slice(i, i + size));
  }
  return pages;
}

export function StudentCredentialSlips({
  classes,
  schoolName,
  schoolNameHindi,
  portalUrl,
}: StudentCredentialSlipsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmState, setConfirmState] = useState<{
    classId: string;
    className: string;
    mode: "missing" | "all";
    count: number;
  } | null>(null);
  const [issuedBatch, setIssuedBatch] = useState<{
    className: string;
    mode: "missing" | "all";
    issuedAt: string;
    slips: StudentCredentialSlip[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleConfirmIssue() {
    if (!confirmState) return;
    const target = confirmState;
    setError(null);
    startTransition(async () => {
      const res = await issueClassCredentialsAction(target.classId, target.mode);
      setConfirmState(null);
      if (res.ok && res.slips && res.className && res.mode && res.issuedAt) {
        setIssuedBatch({
          className: res.className,
          mode: res.mode,
          issuedAt: res.issuedAt,
          slips: res.slips,
        });
        router.refresh();
      } else {
        setError(res.error ?? "Failed to issue credentials.");
      }
    });
  }

  const slipPages = issuedBatch ? chunkSlips(issuedBatch.slips, SLIPS_PER_PAGE) : [];

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          aside, header, nav, .no-print {
            display: none !important;
          }
          body, main {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .print-sheet {
            page-break-after: always;
            break-after: page;
          }
          .print-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-slip {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen-only warnings and controls */}
      <div className="no-print space-y-4">
        <div className="bg-amber-50 border border-amber-300 rounded-md p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 space-y-1">
            <p className="font-semibold">
              One-Time View Only / पासवर्ड केवल इसी स्क्रीन पर दिखेंगे
            </p>
            <p>
              Passwords exist <strong>only in this view</strong> and are never stored in
              plaintext. Print or save the slips before leaving this page; if lost,
              re-issue credentials for that student or class.
            </p>
          </div>
        </div>

        {!portalUrl && (
          <div
            role="alert"
            className="bg-red-50 border border-red-300 rounded-md p-4 flex items-start gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-red-900 space-y-1">
              <p className="font-semibold">
                Portal URL Not Configured (NEXT_PUBLIC_APP_URL is unset)
              </p>
              <p>
                Set <code className="font-mono bg-red-100 px-1 py-0.5 rounded">NEXT_PUBLIC_APP_URL</code> in
                your environment so printed slips include the official portal web address.
                No guessed URL will be printed while this variable is unset.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        {/* Class Table */}
        <div className="bg-white rounded-md border border-[#E8E0D4] overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-[#E8E0D4] bg-[#FAF7F2] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#2D2A26]">
              Classes (Current Academic Session)
            </h2>
            <span className="text-xs text-[#7A7267]">
              Select a class to issue or re-issue login slips
            </span>
          </div>
          <div className="divide-y divide-[#E8E0D4]">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#2D2A26]">
                    Class {cls.name} / कक्षा {cls.name}
                  </p>
                  <p className="text-xs text-[#7A7267] mt-0.5">
                    Active: <strong>{cls.totalActive}</strong> · Issued:{" "}
                    <strong className="text-emerald-700">{cls.issuedCount}</strong> ·
                    Not Yet Issued:{" "}
                    <strong className="text-amber-700">{cls.missingCount}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending || cls.missingCount === 0}
                    onClick={() =>
                      setConfirmState({
                        classId: cls.id,
                        className: cls.name,
                        mode: "missing",
                        count: cls.missingCount,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold text-white bg-[#6B1D30] hover:bg-[#541624] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Issue Missing ({cls.missingCount})
                  </button>
                  <button
                    type="button"
                    disabled={isPending || cls.totalActive === 0}
                    onClick={() =>
                      setConfirmState({
                        classId: cls.id,
                        className: cls.name,
                        mode: "all",
                        count: cls.totalActive,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-red-300 bg-white text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Re-issue Entire Class ({cls.totalActive})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmState && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-md border border-[#E8E0D4] max-w-md w-full p-5 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    confirmState.mode === "all" ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-[#2D2A26]">
                    {confirmState.mode === "all"
                      ? `Re-issue Entire Class ${confirmState.className}?`
                      : `Issue Missing Credentials for Class ${confirmState.className}?`}
                  </h3>
                  {confirmState.mode === "all" ? (
                    <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded p-2.5 leading-relaxed">
                      <strong>Warning:</strong> Re-issuing credentials for all{" "}
                      <strong>{confirmState.count}</strong> active students in Class{" "}
                      {confirmState.className} will immediately invalidate{" "}
                      <strong>
                        both earlier printed slips AND any personal passwords already set by
                        students of this class
                      </strong>
                      . Every student in this class will need their new slip to sign in.
                    </p>
                  ) : (
                    <p className="text-xs text-[#7A7267] leading-relaxed">
                      This will generate initial login slips for{" "}
                      <strong>{confirmState.count}</strong> active student(s) in Class{" "}
                      {confirmState.className} who have never been issued credentials.
                      Students who already received credentials will not be affected.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmState(null)}
                  className="px-3 py-1.5 rounded-sm border border-[#E8E0D4] text-xs font-medium text-[#2D2A26] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleConfirmIssue}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold text-white cursor-pointer ${
                    confirmState.mode === "all"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#6B1D30] hover:bg-[#541624]"
                  } disabled:opacity-50`}
                >
                  {isPending
                    ? "Generating Slips..."
                    : confirmState.mode === "all"
                    ? "Yes, Invalidate & Re-issue All"
                    : "Generate Slips"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Action Bar */}
        {issuedBatch && issuedBatch.slips.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-semibold">
                  Generated {issuedBatch.slips.length} slip(s) for Class{" "}
                  {issuedBatch.className}
                </span>{" "}
                ({issuedBatch.mode === "all" ? "Full Class Re-issue" : "Missing Only"}).
                Print now — passwords cannot be retrieved once you leave this page.
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs cursor-pointer shrink-0"
            >
              <Printer className="h-4 w-4" />
              Print Slips ({slipPages.length} A4 Page{slipPages.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>

      {/* Printable A4 Slips (8 per page, 2 columns x 4 rows) */}
      {issuedBatch && issuedBatch.slips.length > 0 && (
        <div className="space-y-6 print:space-y-0">
          {slipPages.map((pageSlips, pageIndex) => (
            <div
              key={pageIndex}
              className="print-sheet bg-white border border-[#E8E0D4] print:border-0 p-4 print:p-0 rounded-md"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 print:gap-2.5">
                {pageSlips.map((slip) => (
                  <div
                    key={slip.admissionNo}
                    className="print-slip border border-dashed border-gray-400 rounded-xs p-3 text-gray-900 flex flex-col justify-between min-h-[64mm]"
                  >
                    <div className="border-b border-gray-300 pb-1.5 mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold leading-tight">{schoolNameHindi}</p>
                        <p className="text-[11px] font-semibold text-gray-700 leading-tight">
                          {schoolName}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded-xs shrink-0">
                        छात्र पोर्टल / Student Login
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs my-1">
                      <div>
                        <span className="text-[10px] text-gray-500 block">
                          छात्र का नाम / Student Name
                        </span>
                        <span className="font-bold text-gray-900">{slip.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">
                          कक्षा / Class
                        </span>
                        <span className="font-bold text-gray-900">
                          Class {slip.className} (कक्षा {slip.className})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">
                          प्रवेश संख्या (लॉगिन आईडी) / Admission No
                        </span>
                        <span className="font-mono font-bold text-sm text-gray-900">
                          {slip.admissionNo}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 block">
                          प्रारंभिक पासवर्ड / Initial Password
                        </span>
                        <span className="font-mono font-bold text-sm tracking-wider bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 text-gray-900">
                          {slip.initialPassword}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-1.5 mt-2 text-[10px] text-gray-700 space-y-0.5">
                      {portalUrl && (
                        <p className="font-medium truncate">
                          <strong>पोर्टल पता / Portal URL:</strong>{" "}
                          <span className="font-mono">{portalUrl}</span>
                        </p>
                      )}
                      <p className="font-semibold text-gray-900">
                        प्रथम लॉगिन पर अपना पासवर्ड अवश्य बदलें • Change this password at first login.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
